// manualCommission.ts — pencatatan manual komisi & koin dengan four-eyes (v2.7.58).
//
// Use-case: mitra menutup polis di luar aplikasi (telepon, kunjungan,
// mitra institusi). Komisi dan koin harus tetap tercatat di walletnya.
// Finance bisa MENGAJUKAN kredit manual, tapi MASTER_ADMIN WAJIB menyetujui
// sebelum dana benar-benar terbukukan (two-person rule / four-eyes).
//
// Aksi:
//   finance_request_manual_commission  — FINANCE_ROLES (tidak termasuk
//                                        OPERATOR, konsisten dengan
//                                        wallet mutations); membuat baris
//                                        PENDING, notifikasi MASTER_ADMIN.
//   admin_list_manual_commission_requests — FINANCE_ROLES; filter scope
//                                           'pending' | 'mine' | 'all'.
//   master_decide_manual_commission    — MASTER_ADMIN only; approve atau
//                                        reject. Approve → panggil RPC
//                                        credit_agent_wallet + sp_coin_ledger
//                                        + increment_coins_balance, lalu
//                                        pindah status PENDING→APPROVED→APPLIED.
//                                        Reject → PENDING→REJECTED (final).
//                                        Anti self-approve: decided_by harus
//                                        beda dari requested_by.
import type { GatewayContext, ActionResult } from './types.ts';

const json = (body: unknown, status = 200): ActionResult => ({ status, body });

const CAN_REQUEST = ['MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR'];
const CAN_DECIDE  = ['MASTER_ADMIN'];
const CAN_VIEW    = ['MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR'];

// Batas kewajaran untuk sanity-check saja (bukan hard policy limit — itu
// urusan MASTER_ADMIN yang memutuskan). 100jt komisi + 1jt koin dianggap
// cukup untuk skala polis fleet terbesar yang pernah kami lihat.
const MAX_COMMISSION_IDR = 100_000_000;
const MAX_COIN_AMOUNT    = 1_000_000;

export async function handleManualCommissionAction(
  action: string,
  ctx: GatewayContext,
): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram } = ctx;

  switch (action) {
    // ── Finance mengajukan kredit manual ──────────────────────────────────
    case 'finance_request_manual_commission': {
      if (!CAN_REQUEST.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: finance/admin only' }, 403);
      }
      if (!caller.spUser?.id) return json({ error: 'No profile' }, 403);

      const agentId = String(params.agent_id ?? '').trim();
      const commissionAmount = Number(params.commission_amount ?? 0);
      const coinAmount       = Number(params.coin_amount ?? 0);
      const reason           = String(params.reason ?? '').trim();
      const policyRef        = params.policy_ref ? String(params.policy_ref).trim().slice(0, 100) : null;

      if (!agentId) return json({ error: 'agent_id wajib diisi' }, 400);
      if (!reason) return json({ error: 'Alasan wajib diisi (catatan audit)' }, 400);
      if (reason.length < 10) return json({ error: 'Alasan minimal 10 karakter' }, 400);
      if (reason.length > 1000) return json({ error: 'Alasan maksimal 1000 karakter' }, 400);
      if (!(commissionAmount > 0 || coinAmount > 0)) {
        return json({ error: 'Minimal komisi atau koin > 0' }, 400);
      }
      if (commissionAmount < 0 || coinAmount < 0) {
        return json({ error: 'Nominal tidak boleh negatif' }, 400);
      }
      if (commissionAmount > MAX_COMMISSION_IDR) {
        return json({ error: `Komisi melebihi batas kewajaran (Rp ${MAX_COMMISSION_IDR.toLocaleString('id-ID')}). Konfirmasi dengan MASTER_ADMIN.` }, 400);
      }
      if (coinAmount > MAX_COIN_AMOUNT) {
        return json({ error: `Koin melebihi batas kewajaran (${MAX_COIN_AMOUNT.toLocaleString('id-ID')}).` }, 400);
      }

      // Pastikan target benar-benar AGENT — mencegah kredit ke CUSTOMER/ADMIN.
      const { data: agent, error: agentErr } = await db.from('sp_users')
        .select('id, name, email, role, verified')
        .eq('id', agentId)
        .maybeSingle();
      if (agentErr) return json({ error: agentErr.message }, 400);
      if (!agent) return json({ error: 'Mitra tidak ditemukan' }, 404);
      if (agent.role !== 'AGENT') {
        return json({ error: `Hanya untuk mitra (AGENT). Target ini: ${agent.role}` }, 400);
      }

      const { data: inserted, error: insErr } = await db
        .from('sp_manual_commission_requests')
        .insert({
          agent_id: agentId,
          commission_amount: commissionAmount,
          coin_amount: Math.floor(coinAmount),
          reason,
          policy_ref: policyRef,
          requested_by: caller.spUser.id,
          status: 'PENDING',
        })
        .select('*')
        .single();
      if (insErr) return json({ error: insErr.message }, 400);

      // Notifikasi admin — muncul di lonceng CMS. MASTER_ADMIN melihat
      // antrean approval di menu khusus (credit_approvals).
      db.from('sp_admin_notifications').insert({
        type: 'MANUAL_CREDIT_REQUEST',
        title: 'Permintaan Kredit Manual Komisi',
        body: `${caller.email} meminta kredit Rp ${commissionAmount.toLocaleString('id-ID')} + ${coinAmount} koin untuk ${agent.name} (${agent.email}). Menunggu persetujuan MASTER_ADMIN.`,
        read: false,
        metadata: {
          request_id: inserted.id,
          agent_id: agentId,
          commission_amount: commissionAmount,
          coin_amount: coinAmount,
          policy_ref: policyRef,
          requested_by: caller.email,
        },
      }).then(() => {}, () => {});

      sendTelegram(
        `Permintaan Kredit Manual - SurePath\n\n` +
        `Mitra: ${agent.name} (${agent.email})\n` +
        `Komisi: Rp ${commissionAmount.toLocaleString('id-ID')}\n` +
        `Koin: ${coinAmount}\n` +
        (policyRef ? `Ref polis: ${policyRef}\n` : '') +
        `Diminta oleh: ${caller.email}\n` +
        `Alasan: ${reason.slice(0, 200)}\n\n` +
        `Butuh approval MASTER_ADMIN.`,
      );

      return json({ data: inserted });
    }

    // ── Daftar permintaan ──────────────────────────────────────────────────
    case 'admin_list_manual_commission_requests': {
      if (!CAN_VIEW.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: finance/admin only' }, 403);
      }
      if (!caller.spUser?.id) return json({ error: 'No profile' }, 403);

      const scope = String(params.scope ?? 'all');
      const statusFilter = params.status ? String(params.status) : null;
      const limit = Math.min(Number(params.limit ?? 200), 500);

      let q = db.from('sp_manual_commission_requests')
        .select('*, agent:sp_users!agent_id(id,name,email,agent_code), requester:sp_users!requested_by(id,name,email), decider:sp_users!decided_by(id,name,email)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (scope === 'pending') {
        q = q.eq('status', 'PENDING');
      } else if (scope === 'mine') {
        q = q.eq('requested_by', caller.spUser.id);
      }
      if (statusFilter) {
        q = q.eq('status', statusFilter);
      }

      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    // ── MASTER_ADMIN memutuskan ──────────────────────────────────────────
    case 'master_decide_manual_commission': {
      if (!CAN_DECIDE.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: hanya MASTER_ADMIN' }, 403);
      }
      if (!caller.spUser?.id) return json({ error: 'No profile' }, 403);

      const requestId = String(params.request_id ?? '').trim();
      const approve   = params.approve === true;
      const note      = params.decision_note ? String(params.decision_note).trim().slice(0, 1000) : null;

      if (!requestId) return json({ error: 'request_id wajib diisi' }, 400);
      if (!approve && (!note || note.length < 5)) {
        return json({ error: 'Alasan penolakan wajib diisi (min 5 karakter)' }, 400);
      }

      const { data: req, error: readErr } = await db
        .from('sp_manual_commission_requests')
        .select('*, agent:sp_users!agent_id(id,name,email,agent_code)')
        .eq('id', requestId)
        .maybeSingle();
      if (readErr) return json({ error: readErr.message }, 400);
      if (!req) return json({ error: 'Permintaan tidak ditemukan' }, 404);
      if (req.status !== 'PENDING') {
        return json({ error: `Permintaan sudah berstatus ${req.status}, tidak bisa diputuskan ulang` }, 409);
      }
      // Four-eyes — pengaju tidak boleh meng-approve sendiri. CHECK di DB
      // juga memblokir, tapi cek di sini memberi pesan lebih jelas.
      if (req.requested_by === caller.spUser.id) {
        return json({ error: 'Anda tidak bisa memutuskan permintaan yang Anda ajukan sendiri (four-eyes).' }, 403);
      }

      // Jalur REJECT
      if (!approve) {
        const { data: updated, error: updErr } = await db
          .from('sp_manual_commission_requests')
          .update({
            status: 'REJECTED',
            decided_by: caller.spUser.id,
            decided_at: new Date().toISOString(),
            decision_note: note,
          })
          .eq('id', requestId)
          .select('*')
          .single();
        if (updErr) return json({ error: updErr.message }, 400);

        db.from('sp_admin_notifications').insert({
          type: 'MANUAL_CREDIT_DECIDED',
          title: 'Kredit Manual Ditolak',
          body: `Permintaan untuk ${req.agent?.name ?? req.agent_id} ditolak oleh ${caller.email}. Alasan: ${note}`,
          read: false,
          metadata: { request_id: requestId, outcome: 'REJECTED', decided_by: caller.email },
        }).then(() => {}, () => {});

        sendTelegram(
          `Kredit Manual DITOLAK - SurePath\n\n` +
          `Mitra: ${req.agent?.name ?? '-'}\n` +
          `Diputuskan oleh: ${caller.email}\n` +
          `Alasan: ${note}`,
        );

        return json({ data: updated });
      }

      // Jalur APPROVE — tandai APPROVED dulu supaya kegagalan di langkah
      // credit tidak bisa dieksekusi dua kali (status harus PENDING untuk
      // bisa masuk sini).
      const nowIso = new Date().toISOString();
      const { data: approved, error: aErr } = await db
        .from('sp_manual_commission_requests')
        .update({
          status: 'APPROVED',
          decided_by: caller.spUser.id,
          decided_at: nowIso,
          decision_note: note,
        })
        .eq('id', requestId)
        .eq('status', 'PENDING') // optimistic concurrency
        .select('*')
        .single();
      if (aErr || !approved) {
        return json({ error: aErr?.message ?? 'Gagal menandai permintaan sebagai APPROVED (sudah diputuskan oleh pihak lain?)' }, 409);
      }

      // 1) Catat baris sp_commissions sebagai referensi (muncul di
      //    CommissionLedger, konsisten dengan admin_create_commission).
      const { data: commissionRow } = await db.from('sp_commissions').insert({
        agent_id: req.agent_id,
        client_name: `Manual: ${req.policy_ref ?? 'offline'}`,
        product_type: 'MANUAL',
        premium_amount: 0,
        commission_amount: Number(req.commission_amount),
        commission_rate: 0,
        coin_reward: Number(req.coin_amount),
        status: 'PAID',
        paid_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      }).select('id').maybeSingle();

      // 2) Kredit wallet via RPC. Reference: id permintaan manual ini.
      if (Number(req.commission_amount) > 0) {
        const { error: walletErr } = await db.rpc('credit_agent_wallet', {
          p_agent_id: req.agent_id,
          p_amount: Number(req.commission_amount),
          p_reference_id: String(requestId),
          p_reference_type: 'MANUAL_COMMISSION',
          p_description: `Komisi manual: ${req.policy_ref ?? 'offline'} — disetujui ${caller.email}`,
        });
        if (walletErr) {
          // Biarkan status APPROVED — audit terlihat jelas, MASTER_ADMIN
          // bisa memutuskan apakah retry atau roll back manual.
          return json({
            error: `Permintaan disetujui tetapi gagal memanggil credit_agent_wallet: ${walletErr.message}`,
            data: approved,
            code: 'APPROVED_WALLET_FAILED',
          }, 500);
        }
      }

      // 3) Koin via sp_coin_ledger + RPC increment_coins_balance.
      if (Number(req.coin_amount) > 0) {
        const coins = Math.floor(Number(req.coin_amount));
        await db.from('sp_coin_ledger').insert({
          agent_id: req.agent_id,
          type: 'EARNED',
          coins,
          rp_value: coins * 1000,
          description: `Koin manual: ${req.policy_ref ?? 'offline'} — disetujui ${caller.email}`,
        });
        await db.rpc('increment_coins_balance', { p_agent_id: req.agent_id, p_delta: coins });
      }

      // 4) Ambil wallet tx id yang baru dibuat (reference_id = request id).
      const { data: walletTx } = await db.from('sp_wallet_transactions')
        .select('id')
        .eq('agent_id', req.agent_id)
        .eq('reference_id', requestId)
        .eq('reference_type', 'MANUAL_COMMISSION')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 5) Pindah ke APPLIED. Simpan id transaksi wallet sebagai audit link.
      const { data: applied, error: applyErr } = await db
        .from('sp_manual_commission_requests')
        .update({
          status: 'APPLIED',
          applied_wallet_tx_id: walletTx?.id ?? null,
          applied_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select('*')
        .single();
      if (applyErr) {
        return json({
          error: `Kredit sukses tetapi gagal menandai APPLIED: ${applyErr.message}`,
          data: approved,
          code: 'CREDIT_OK_MARK_FAILED',
        }, 500);
      }

      // 6) Notifikasi mitra.
      db.from('sp_notifications').insert({
        agent_id: req.agent_id,
        type: 'COMMISSION_EARNED',
        title: 'Komisi Diperoleh (Manual)',
        body: `Komisi Rp ${Number(req.commission_amount).toLocaleString('id-ID')} + ${req.coin_amount} koin telah dikreditkan ke dompet Anda${req.policy_ref ? ` untuk ${req.policy_ref}` : ''}.`,
        read: false,
        metadata: {
          request_id: requestId,
          commission_amount: req.commission_amount,
          coin_amount: req.coin_amount,
          policy_ref: req.policy_ref,
          commission_id: commissionRow?.id ?? null,
        },
      }).then(() => {}, () => {});

      db.from('sp_admin_notifications').insert({
        type: 'MANUAL_CREDIT_DECIDED',
        title: 'Kredit Manual Disetujui',
        body: `Kredit Rp ${Number(req.commission_amount).toLocaleString('id-ID')} + ${req.coin_amount} koin untuk ${req.agent?.name ?? req.agent_id} disetujui ${caller.email}.`,
        read: false,
        metadata: {
          request_id: requestId,
          outcome: 'APPLIED',
          decided_by: caller.email,
          wallet_tx_id: walletTx?.id ?? null,
        },
      }).then(() => {}, () => {});

      sendTelegram(
        `Kredit Manual DISETUJUI - SurePath\n\n` +
        `Mitra: ${req.agent?.name ?? '-'} (${req.agent?.email ?? '-'})\n` +
        `Komisi: Rp ${Number(req.commission_amount).toLocaleString('id-ID')}\n` +
        `Koin: ${req.coin_amount}\n` +
        (req.policy_ref ? `Ref: ${req.policy_ref}\n` : '') +
        `Diputuskan oleh: ${caller.email}`,
      );

      return json({ data: applied });
    }

    default:
      return null;
  }
}
