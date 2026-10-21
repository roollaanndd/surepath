// marketing.ts — CRM & KPI untuk karyawan marketing/sales (Fase 1)
//
// Dibangun lebih dulu dari Fase 0 (tulang belakang produksi) dengan sengaja:
// pipeline rekrutmen dan follow-up tidak butuh data produksi sama sekali.
// Kolom ANGKA produksi (premi, komisi, status bayar) BELUM dimunculkan di sini
// karena sumbernya belum sah — per 21 Okt 2026 sp_payments 0 baris,
// sp_commissions 0 dari 13 tertaut order, policy_number 0 dari 5 terisi.
// Memunculkannya sekarang berarti menampilkan angka yang terlihat meyakinkan
// dan salah, dan untuk aplikasi uang itu lebih berbahaya daripada kosong.
//
// Yang DISAJIKAN sekarang dan sudah nyata: tahap rekrutmen, umur per tahap,
// apakah seorang agen pernah berproduksi sama sekali, dan janji follow-up yang
// lewat tanggal.
import type { GatewayContext, ActionResult } from './types.ts';

const json = (body: unknown, status = 200): ActionResult => ({ status, body });

const MARKETING = 'MARKETING';

/** Subtree seorang marketing: dirinya + marketing di bawahnya (L2). */
async function subtreeIds(db: any, meId: string): Promise<string[]> {
  const { data } = await db
    .from('sp_users')
    .select('id')
    .eq('marketing_parent_id', meId)
    .eq('role', MARKETING);
  return [meId, ...(data ?? []).map((r: any) => r.id)];
}

/**
 * Siapa yang boleh dilihat pemanggil.
 * - ADMIN: siapa pun (handlerIds = null berarti "tanpa batas")
 * - MARKETING: hanya agen di subtree-nya
 * - lainnya: tidak boleh
 *
 * Batasnya dihitung DI SINI dari peran yang sudah diverifikasi, bukan dari
 * params. Itu aturan yang sama dengan agent_id/client_id di modul lain.
 */
async function scope(ctx: GatewayContext): Promise<{ handlerIds: string[] | null } | null> {
  const { db, caller } = ctx;
  if (caller.isAdmin) return { handlerIds: null };
  if ((caller.role ?? '') !== MARKETING || !caller.spUser) return null;
  return { handlerIds: await subtreeIds(db, caller.spUser.id) };
}

/** Tahap pipeline, diturunkan dari kolom yang SUDAH ada — bukan status baru. */
function stageOf(u: any, pernahProduksi: boolean): string {
  if (pernahProduksi) return 'PRODUKTIF';
  if (u.verified === true || String(u.identity_status ?? '').toUpperCase() === 'APPROVED') return 'TERVERIFIKASI';
  if (u.identity_submitted_at) return 'DOKUMEN';
  return 'DAFTAR';
}

const hariSejak = (iso: string | null | undefined): number | null =>
  iso ? Math.floor((Date.now() - Date.parse(iso)) / 86_400_000) : null;

export async function handleMarketingAction(
  action: string,
  ctx: GatewayContext,
): Promise<ActionResult | null> {
  const { db, params, caller } = ctx;

  switch (action) {
    // ── Daftar agen yang dipegang ────────────────────────────────────────────
    case 'marketing_list_agents': {
      const s = await scope(ctx);
      if (!s) return json({ error: 'Forbidden: marketing only' }, 403);

      let q = db
        .from('sp_users')
        .select('id, name, email, phone, agent_code, tier, verified, identity_status, identity_submitted_at, created_at, handler_id, handler_assigned_at')
        .eq('role', 'AGENT')
        .order('created_at', { ascending: false })
        .limit(Math.min(Number(params.limit ?? 200), 500));

      if (s.handlerIds) q = q.in('handler_id', s.handlerIds);
      else if (params.handler_id) q = q.eq('handler_id', String(params.handler_id));

      const { data: agents, error } = await q;
      if (error) return json({ error: error.message }, 400);

      const ids = (agents ?? []).map((a: any) => a.id);
      // Satu kueri untuk semua agen, bukan N+1.
      const { data: orders } = ids.length
        ? await db.from('sp_policy_orders')
            .select('agent_id, created_at')
            .in('agent_id', ids)
            .is('deleted_at', null)
        : { data: [] };
      const { data: acts } = ids.length
        ? await db.from('sp_marketing_activities')
            .select('agent_id, created_at')
            .in('agent_id', ids)
            .order('created_at', { ascending: false })
        : { data: [] };

      const orderTerakhir = new Map<string, string>();
      for (const o of orders ?? []) {
        const prev = orderTerakhir.get(o.agent_id);
        if (!prev || Date.parse(o.created_at) > Date.parse(prev)) orderTerakhir.set(o.agent_id, o.created_at);
      }
      const aktivitasTerakhir = new Map<string, string>();
      for (const a of acts ?? []) if (a.agent_id && !aktivitasTerakhir.has(a.agent_id)) aktivitasTerakhir.set(a.agent_id, a.created_at);

      const rows = (agents ?? []).map((a: any) => {
        const last = orderTerakhir.get(a.id) ?? null;
        return {
          ...a,
          stage: stageOf(a, !!last),
          // Metrik yang paling sering disembunyikan dashboard, dan paling
          // menentukan: 23 agen terdaftar, 2 pernah berproduksi (21 Okt 2026).
          pernah_produksi: !!last,
          hari_sejak_order_terakhir: hariSejak(last),
          hari_sejak_aktivitas: hariSejak(aktivitasTerakhir.get(a.id) ?? null),
          umur_hari: hariSejak(a.created_at),
        };
      });

      return json({ data: rows });
    }

    // ── Ringkasan dashboard: pipeline + antrean ─────────────────────────────
    case 'marketing_dashboard_summary': {
      const s = await scope(ctx);
      if (!s) return json({ error: 'Forbidden: marketing only' }, 403);

      let q = db
        .from('sp_users')
        .select('id, verified, identity_status, identity_submitted_at, created_at')
        .eq('role', 'AGENT');
      if (s.handlerIds) q = q.in('handler_id', s.handlerIds);
      const { data: agents, error } = await q;
      if (error) return json({ error: error.message }, 400);

      const ids = (agents ?? []).map((a: any) => a.id);
      const { data: orders } = ids.length
        ? await db.from('sp_policy_orders').select('agent_id').in('agent_id', ids).is('deleted_at', null)
        : { data: [] };
      const produktif = new Set((orders ?? []).map((o: any) => o.agent_id));

      const pipeline: Record<string, { jumlah: number; mandek_14h: number }> = {
        DAFTAR: { jumlah: 0, mandek_14h: 0 },
        DOKUMEN: { jumlah: 0, mandek_14h: 0 },
        TERVERIFIKASI: { jumlah: 0, mandek_14h: 0 },
        PRODUKTIF: { jumlah: 0, mandek_14h: 0 },
      };
      for (const a of agents ?? []) {
        const st = stageOf(a, produktif.has(a.id));
        pipeline[st].jumlah += 1;
        // Umur di TAHAP, bukan umur akun: itu yang menunjukkan kemandekan.
        const sejak = st === 'DOKUMEN' ? a.identity_submitted_at : a.created_at;
        if (st !== 'PRODUKTIF' && (hariSejak(sejak) ?? 0) > 14) pipeline[st].mandek_14h += 1;
      }

      // Janji follow-up yang sudah lewat tanggal — ini yang dibuka tiap pagi.
      let fq = db
        .from('sp_marketing_activities')
        .select('id', { count: 'exact', head: true })
        .not('next_action_at', 'is', null)
        .lt('next_action_at', new Date().toISOString());
      if (s.handlerIds) fq = fq.in('marketing_id', s.handlerIds);
      const { count: telatCount } = await fq;

      let uq = db.from('sp_users').select('id', { count: 'exact', head: true })
        .eq('role', 'AGENT').is('handler_id', null);
      const { count: tanpaHandler } = await uq;

      return json({
        data: {
          pipeline,
          total_agen: (agents ?? []).length,
          belum_pernah_produksi: (agents ?? []).length - produktif.size,
          follow_up_telat: telatCount ?? 0,
          agen_tanpa_handler: tanpaHandler ?? 0,
          catatan_produksi: 'Angka premi/komisi/status bayar belum ditampilkan: sumbernya belum sah sampai Fase 0 selesai.',
        },
      });
    }

    // ── Detail satu agen ────────────────────────────────────────────────────
    case 'marketing_agent_detail': {
      const s = await scope(ctx);
      if (!s) return json({ error: 'Forbidden: marketing only' }, 403);
      const agentId = String(params.agent_id ?? '');
      if (!agentId) return json({ error: 'agent_id required' }, 400);

      const { data: agent, error } = await db
        .from('sp_users')
        .select('id, name, email, phone, agent_code, tier, verified, identity_status, identity_submitted_at, created_at, handler_id, handler_assigned_at')
        .eq('id', agentId)
        .eq('role', 'AGENT')
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!agent) return json({ error: 'Agent not found' }, 404);
      // Batas kepemilikan ditegakkan SETELAH baris dibaca, dari handler_id
      // baris itu sendiri — bukan dari params.
      if (s.handlerIds && !s.handlerIds.includes(agent.handler_id ?? '')) {
        return json({ error: 'Forbidden: bukan agen Anda' }, 403);
      }

      const { data: activities } = await db
        .from('sp_marketing_activities')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: handlerHistory } = await db
        .from('sp_agent_handler_history')
        .select('*')
        .eq('agent_id', agentId)
        .order('valid_from', { ascending: false });

      const { data: orders } = await db
        .from('sp_policy_orders')
        .select('id, order_number, product_name, status, total_premium, commission_amount, start_date, end_date, policy_number, insurer_name, created_at')
        .eq('agent_id', agentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      return json({ data: { agent, activities: activities ?? [], handler_history: handlerHistory ?? [], orders: orders ?? [] } });
    }

    // ── Catat aktivitas / follow-up ─────────────────────────────────────────
    case 'marketing_log_activity': {
      if ((caller.role ?? '') !== MARKETING || !caller.spUser) {
        return json({ error: 'Forbidden: marketing only' }, 403);
      }
      const kind = String(params.kind ?? '').toUpperCase();
      if (!['CALL', 'WA', 'VISIT', 'TRAINING', 'OTHER'].includes(kind)) {
        return json({ error: 'kind tidak valid' }, 400);
      }
      const agentId = params.agent_id ? String(params.agent_id) : null;
      const prospectName = String(params.prospect_name ?? '').trim() || null;
      if (!agentId && !prospectName) return json({ error: 'agent_id atau prospect_name wajib' }, 400);

      // Hanya boleh mencatat untuk agen di subtree sendiri.
      if (agentId) {
        const ids = await subtreeIds(db, caller.spUser.id);
        const { data: agent } = await db.from('sp_users').select('id, handler_id').eq('id', agentId).maybeSingle();
        if (!agent) return json({ error: 'Agent not found' }, 404);
        if (!ids.includes(agent.handler_id ?? '')) return json({ error: 'Forbidden: bukan agen Anda' }, 403);
      }

      const { data, error } = await db
        .from('sp_marketing_activities')
        .insert({
          marketing_id: caller.spUser.id,   // dari pemanggil terverifikasi, bukan params
          agent_id: agentId,
          prospect_name: prospectName,
          kind,
          outcome: String(params.outcome ?? '').slice(0, 500) || null,
          note: String(params.note ?? '').slice(0, 2000) || null,
          next_action: String(params.next_action ?? '').slice(0, 500) || null,
          next_action_at: params.next_action_at ? String(params.next_action_at) : null,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    // ── Antrean tindakan: janji yang lewat tanggal ──────────────────────────
    case 'marketing_list_activities': {
      const s = await scope(ctx);
      if (!s) return json({ error: 'Forbidden: marketing only' }, 403);

      let q = db
        .from('sp_marketing_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Math.min(Number(params.limit ?? 200), 500));
      if (s.handlerIds) q = q.in('marketing_id', s.handlerIds);
      if (params.agent_id) q = q.eq('agent_id', String(params.agent_id));
      if (params.hanya_telat === true) {
        q = q.not('next_action_at', 'is', null).lt('next_action_at', new Date().toISOString());
      }
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    // ── Agen tanpa handler: antrean penugasan ───────────────────────────────
    case 'marketing_list_unassigned': {
      const s = await scope(ctx);
      if (!s) return json({ error: 'Forbidden: marketing only' }, 403);
      const { data, error } = await db
        .from('sp_users')
        .select('id, name, email, phone, agent_code, verified, identity_status, created_at')
        .eq('role', 'AGENT')
        .is('handler_id', null)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return json({ error: error.message }, 400);
      return json({ data: (data ?? []).map((a: any) => ({ ...a, umur_hari: hariSejak(a.created_at) })) });
    }

    // ── Penugasan manual (CMS) ──────────────────────────────────────────────
    // ADMIN saja. Seorang marketing tidak boleh menugaskan agen ke dirinya
    // sendiri: itu akan membuat kepemilikan — dan nanti komisi override —
    // bisa diklaim sendiri.
    case 'marketing_assign_agent': {
      if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
      const agentId = String(params.agent_id ?? '');
      const handlerId = params.handler_id ? String(params.handler_id) : null;
      if (!agentId) return json({ error: 'agent_id required' }, 400);

      const { data: agent } = await db.from('sp_users').select('id, role').eq('id', agentId).maybeSingle();
      if (!agent) return json({ error: 'Agent not found' }, 404);
      if (String(agent.role ?? '').toUpperCase() !== 'AGENT') {
        return json({ error: 'Target bukan agen' }, 400);
      }
      if (handlerId) {
        const { data: h } = await db.from('sp_users').select('id, role').eq('id', handlerId).maybeSingle();
        if (!h) return json({ error: 'Marketing not found' }, 404);
        if (String(h.role ?? '').toUpperCase() !== MARKETING) {
          return json({ error: 'Handler harus berperan MARKETING' }, 400);
        }
      }

      // Riwayatnya ditulis oleh trigger sp_users_handler_change, bukan di sini.
      const { data, error } = await db
        .from('sp_users')
        .update({
          handler_id: handlerId,
          handler_assigned_by: caller.spUser?.id ?? null,
          handler_assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', agentId)
        .select('id, name, handler_id, handler_assigned_at')
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    // ── Agen membaca pendampingnya sendiri ──────────────────────────────────
    // Hanya kontak publik (nama, telepon, foto). Agen TIDAK boleh melihat
    // email internal, target, atau struktur marketing, dan tidak boleh
    // mengubah handler-nya sendiri — tidak ada aksi tulis untuk itu di sini.
    case 'get_my_handler': {
      if (!caller.spUser) return json({ data: null });
      const handlerId = caller.spUser.handler_id;
      if (!handlerId) return json({ data: null });
      const { data, error } = await db
        .from('sp_users')
        .select('id, name, phone, profile_photo_url')
        .eq('id', handlerId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ data: data ?? null });
    }

    // ── Master dashboard: satu baris per marketing ──────────────────────────
    case 'admin_marketing_overview': {
      if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);

      const { data: mkt, error } = await db
        .from('sp_users')
        .select('id, name, email, monthly_target, marketing_parent_id, created_at')
        .eq('role', MARKETING)
        .order('name');
      if (error) return json({ error: error.message }, 400);

      const { data: agents } = await db
        .from('sp_users')
        .select('id, handler_id, verified')
        .eq('role', 'AGENT')
        .not('handler_id', 'is', null);
      const { data: orders } = await db
        .from('sp_policy_orders')
        .select('agent_id')
        .is('deleted_at', null);

      const produktif = new Set((orders ?? []).map((o: any) => o.agent_id));
      const perHandler = new Map<string, { agen: number; produktif: number }>();
      for (const a of agents ?? []) {
        const k = a.handler_id as string;
        const cur = perHandler.get(k) ?? { agen: 0, produktif: 0 };
        cur.agen += 1;
        if (produktif.has(a.id)) cur.produktif += 1;
        perHandler.set(k, cur);
      }

      return json({
        data: (mkt ?? []).map((m: any) => ({
          ...m,
          jumlah_agen: perHandler.get(m.id)?.agen ?? 0,
          agen_produktif: perHandler.get(m.id)?.produktif ?? 0,
        })),
      });
    }

    default:
      return null;
  }
}
