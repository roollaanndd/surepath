// documents.ts — document registry actions.
//
// Audit 28 Okt 2026: dokumen yang disubmit nasabah/agen (STNK, foto survey,
// laporan audit foto) sebelumnya tidak pernah tersimpan. Kini klien mengunggah
// berkas langsung ke bucket privat `order-documents` (dengan policy storage
// yang mengecek kepemilikan order), lalu mendaftarkannya lewat aksi
// `orders_attach_documents`. Unduhan memakai signed URL yang diterbitkan
// `documents_signed_url` setelah validasi akses — tidak ada policy SELECT
// langsung untuk klien pada bucket tersebut.

import type { GatewayContext, ActionResult } from './types.ts';

const json = (body: unknown, status = 200): ActionResult => ({ status, body });

// Bucket yang boleh ditandatangani lewat gateway. order-documents adalah
// bucket privat tanpa policy SELECT klien; agent-docs & policy-documents
// sudah punya policy sendiri, tetapi lewat gateway pemeriksaannya seragam.
const SIGNABLE_BUCKETS = new Set(['order-documents', 'agent-docs', 'policy-documents']);

// Tipe dokumen yang boleh dilampirkan ke order.
const ORDER_DOC_TYPES = new Set(['STNK', 'VEHICLE_PHOTO', 'SURVEY_PHOTO', 'SURVEY_AUDIT_REPORT']);

const SIGNED_URL_TTL = 300; // detik

interface DocInput {
  doc_type?: unknown;
  bucket?: unknown;
  path?: unknown;
  url?: unknown;
  mime_type?: unknown;
  size_bytes?: unknown;
  meta?: unknown;
}

function sanitizeDocInput(raw: DocInput): { error?: string; row?: Record<string, unknown> } {
  const docType = String(raw.doc_type ?? '');
  if (!ORDER_DOC_TYPES.has(docType)) return { error: `doc_type tidak diizinkan: ${docType}` };

  const bucket = String(raw.bucket ?? '');
  if (bucket !== 'order-documents') return { error: `bucket tidak diizinkan: ${bucket}` };

  const path = String(raw.path ?? '');
  if (!path || path.includes('..') || !path.includes('/')) return { error: 'path tidak valid' };

  const url = raw.url == null ? null : String(raw.url);
  if (url) {
    if (!url.startsWith('https://') || !url.includes('/storage/v1/object/') || url.length > 2048) {
      return { error: 'url harus https URL objek storage yang valid' };
    }
  }

  const mime = raw.mime_type == null ? null : String(raw.mime_type).slice(0, 100);
  let size: number | null = null;
  if (raw.size_bytes != null) {
    const n = Number(raw.size_bytes);
    if (!Number.isFinite(n) || n < 0 || n > 20 * 1024 * 1024) return { error: 'size_bytes tidak wajar' };
    size = Math.round(n);
  }

  let meta: Record<string, unknown> = {};
  if (raw.meta != null) {
    if (typeof raw.meta !== 'object' || Array.isArray(raw.meta)) return { error: 'meta harus objek' };
    meta = raw.meta as Record<string, unknown>;
    if (JSON.stringify(meta).length > 4096) return { error: 'meta terlalu besar' };
  }

  return {
    row: {
      doc_type: docType,
      bucket,
      path,
      url,
      mime_type: mime,
      size_bytes: size,
      meta,
    },
  };
}

/** Slot foto depan juga menjadi wajah utama order (vehicle_image_url). */
function isFrontPhoto(row: Record<string, unknown>): boolean {
  return row.doc_type === 'VEHICLE_PHOTO'
    && String((row.meta as any)?.slot ?? '') === 'front';
}

export async function handleDocumentsAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller } = ctx;

  switch (action) {

    // ── Daftarkan dokumen order + tulis URL ke vehicle_details ─────────────
    case 'orders_attach_documents': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const orderNumber = String(params.order_number ?? '').trim();
        if (!orderNumber) return json({ error: 'order_number required' }, 400);

        const { data: order, error: ordErr } = await db.from('sp_policy_orders')
          .select('id, order_number, agent_id, client_id, vehicle_details, vehicle_image_url')
          .eq('order_number', orderNumber)
          .maybeSingle();
        if (ordErr) return json({ error: ordErr.message }, 400);
        if (!order) return json({ error: 'Order not found' }, 404);

        const isOwner = caller.ownerIds.includes(String(order.agent_id))
          || (order.client_id != null && caller.ownerIds.includes(String(order.client_id)));
        if (!isOwner && !caller.isAdmin) return json({ error: 'Forbidden: bukan pemilik order ini' }, 403);

        const rawDocs = Array.isArray(params.docs) ? (params.docs as DocInput[]) : [];
        if (rawDocs.length === 0) return json({ error: 'docs required' }, 400);
        if (rawDocs.length > 12) return json({ error: 'Maksimal 12 dokumen per panggilan' }, 400);

        const rows: Record<string, unknown>[] = [];
        for (const raw of rawDocs) {
          const { error, row } = sanitizeDocInput(raw);
          if (error || !row) return json({ error: error ?? 'dokumen tidak valid' }, 400);
          // Path wajib berada di folder nomor order ini.
          if (!String(row.path).startsWith(`${orderNumber}/`)) {
            return json({ error: `path harus diawali ${orderNumber}/` }, 403);
          }
          rows.push(row);
        }

        // 1) Registry (idempoten per bucket+path — duplikat diperbarui URL-nya).
        const registryRows = rows.map((r) => ({
          entity_type: 'policy_order',
          entity_id: String(order.order_number ?? order.id),
          doc_type: r.doc_type,
          bucket: r.bucket,
          path: r.path,
          url: r.url,
          mime_type: r.mime_type,
          size_bytes: r.size_bytes,
          uploaded_by: caller.ownerId,
          uploaded_by_role: caller.role,
          meta: r.meta,
        }));
        const { error: regErr } = await db.from('sp_documents')
          .upsert(registryRows, { onConflict: 'bucket,path' });
        if (regErr) return json({ error: regErr.message }, 400);

        // 2) Tulis URL ke vehicle_details agar 5 portal pembaca lama langsung
        //    menampilkan dokumen tanpa perubahan apa pun di sisi mereka.
        const vd: Record<string, unknown> = {
          ...((order.vehicle_details ?? {}) as Record<string, unknown>),
        };
        for (const r of rows) {
          const canonical = r.url as string | null
            ?? `/storage/v1/object/order-documents/${r.path}`;
          switch (r.doc_type) {
            case 'STNK':
              vd.stnk_url = canonical;
              break;
            case 'SURVEY_AUDIT_REPORT':
              vd.survey_report_url = canonical;
              break;
            case 'SURVEY_PHOTO': {
              const arr = Array.isArray(vd.survey_photos) ? [...(vd.survey_photos as unknown[])] : [];
              const slot = String((r.meta as any)?.slot ?? `photo-${arr.length + 1}`);
              const entry = { slot, url: canonical };
              const idx = arr.findIndex((p: any) => p?.slot === slot);
              if (idx >= 0) arr[idx] = entry; else arr.push(entry);
              vd.survey_photos = arr;
              break;
            }
            case 'VEHICLE_PHOTO': {
              const arr = Array.isArray(vd.survey_photos) ? [...(vd.survey_photos as unknown[])] : [];
              const slot = String((r.meta as any)?.slot ?? `photo-${arr.length + 1}`);
              const entry = { slot, url: canonical };
              const idx = arr.findIndex((p: any) => p?.slot === slot);
              if (idx >= 0) arr[idx] = entry; else arr.push(entry);
              vd.survey_photos = arr;
              break;
            }
          }
        }

        const update: Record<string, unknown> = {
          vehicle_details: vd,
          updated_at: new Date().toISOString(),
        };
        const front = rows.find((r) => isFrontPhoto(r));
        if (front) {
          update.vehicle_image_url = (front.url as string | null)
            ?? `/storage/v1/object/order-documents/${front.path}`;
        }

        const { error: updErr } = await db.from('sp_policy_orders')
          .update(update)
          .eq('id', order.id);
        if (updErr) return json({ error: updErr.message }, 400);

        return json({
          data: {
            attached: rows.length,
            vehicle_details: vd,
            vehicle_image_url: update.vehicle_image_url ?? order.vehicle_image_url ?? null,
          },
        });
      }

    // ── Terbitkan signed URL setelah validasi akses ─────────────────────────
    case 'documents_signed_url': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const bucket = String(params.bucket ?? '');
        const path = String(params.path ?? '');
        if (!SIGNABLE_BUCKETS.has(bucket)) return json({ error: `bucket tidak diizinkan: ${bucket}` }, 400);
        if (!path || path.includes('..') || !path.includes('/')) return json({ error: 'path tidak valid' }, 400);

        let allowed = caller.isAdmin;

        if (!allowed && bucket === 'order-documents') {
          // Folder pertama = nomor order; pemilik order boleh mengunduh.
          const orderNumber = path.split('/')[0];
          const { data: order } = await db.from('sp_policy_orders')
            .select('agent_id, client_id')
            .eq('order_number', orderNumber)
            .maybeSingle();
          allowed = !!order && (
            caller.ownerIds.includes(String(order.agent_id))
            || (order.client_id != null && caller.ownerIds.includes(String(order.client_id)))
          );
        }

        if (!allowed && (bucket === 'agent-docs' || bucket === 'policy-documents')) {
          // agent-docs: folder = id pemilik; policy-documents: folder = nomor order.
          const folder = path.split('/')[0];
          if (bucket === 'agent-docs') {
            allowed = caller.ownerIds.includes(folder);
          } else {
            const { data: order } = await db.from('sp_policy_orders')
              .select('agent_id, client_id')
              .eq('order_number', folder)
              .maybeSingle();
            allowed = !!order && (
              caller.ownerIds.includes(String(order.agent_id))
              || (order.client_id != null && caller.ownerIds.includes(String(order.client_id)))
            );
          }
        }

        if (!allowed) return json({ error: 'Forbidden' }, 403);

        const { data, error } = await db.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
        if (error || !data) return json({ error: error?.message ?? 'Gagal menerbitkan signed URL' }, 400);
        return json({ data: { signed_url: data.signedUrl, expires_in: SIGNED_URL_TTL } });
      }

    // ── Daftar dokumen terdaftar (admin: semua; pemilik: miliknya) ─────────
    case 'documents_list': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const entityType = params.entity_type ? String(params.entity_type) : null;
        const entityId = params.entity_id ? String(params.entity_id) : null;
        const docType = params.doc_type ? String(params.doc_type) : null;
        const limit = Math.min(Number(params.limit ?? 200) || 200, 500);

        // Admin boleh mendaftar semua; non-admin hanya miliknya sendiri,
        // atau dokumen sebuah order yang dimilikinya.
        if (!caller.isAdmin) {
          if (entityType === 'policy_order' && entityId) {
            const { data: order } = await db.from('sp_policy_orders')
              .select('agent_id, client_id')
              .eq('order_number', entityId)
              .maybeSingle();
            const isOwner = !!order && (
              caller.ownerIds.includes(String(order.agent_id))
              || (order.client_id != null && caller.ownerIds.includes(String(order.client_id)))
            );
            if (!isOwner) return json({ error: 'Forbidden' }, 403);
          } else {
            return json({ error: 'Forbidden: admin only' }, 403);
          }
        }

        let q = db.from('sp_documents').select('*').order('created_at', { ascending: false }).limit(limit);
        if (entityType) q = q.eq('entity_type', entityType);
        if (entityId)  q = q.eq('entity_id', entityId);
        if (docType)   q = q.eq('doc_type', docType);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    // ── Arsipkan PDF perjanjian mitra yang dibuat klien saat persetujuan ────
    case 'agreements_attach_pdf': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const agreementId = String(params.agreement_id ?? '');
        const bucket = String(params.bucket ?? '');
        const path = String(params.path ?? '');
        const url = params.url == null ? null : String(params.url);
        if (!agreementId) return json({ error: 'agreement_id required' }, 400);
        if (bucket !== 'agent-docs') return json({ error: 'bucket tidak diizinkan' }, 400);
        if (!path.startsWith(`${caller.ownerId}/`)) return json({ error: 'path harus di folder milik Anda' }, 403);
        if (url && (!url.startsWith('https://') || !url.includes('/storage/v1/object/') || url.length > 2048)) {
          return json({ error: 'url tidak valid' }, 400);
        }

        const { data: agreement } = await db.from('sp_agent_agreements')
          .select('id, agent_id')
          .eq('id', agreementId)
          .maybeSingle();
        if (!agreement) return json({ error: 'Agreement not found' }, 404);
        if (!caller.ownerIds.includes(String(agreement.agent_id))) return json({ error: 'Forbidden' }, 403);

        const { error: updErr } = await db.from('sp_agent_agreements')
          .update({ pdf_bucket: bucket, pdf_path: path, pdf_url: url })
          .eq('id', agreementId);
        if (updErr) return json({ error: updErr.message }, 400);

        const { error: regErr } = await db.from('sp_documents').upsert({
          entity_type: 'agreement',
          entity_id: agreementId,
          doc_type: 'AGREEMENT_PDF',
          bucket,
          path,
          url,
          mime_type: 'application/pdf',
          uploaded_by: caller.ownerId,
          uploaded_by_role: caller.role,
          meta: { source: 'acceptance_gate' },
        }, { onConflict: 'bucket,path' });
        if (regErr) return json({ error: regErr.message }, 400);

        return json({ data: { success: true } });
      }

    default:
      return null; // Not handled by this module
  }
}
