// users.ts — 10 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

export async function handleUsersAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY } = ctx;

  switch (action) {
    case 'get_my_profile': {
        if (!caller.spUser) return json({ error: 'No SurePath profile linked to this account' }, 404);
        return json({ data: caller.spUser });
      }

    case 'accept_agreement': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const fullName = String(params.full_name ?? '').trim();
        const ktpNumber = String(params.ktp_number ?? '').trim();
        if (fullName.length < 3) return json({ error: 'Name too short' }, 400);
        if (!/^[0-9]{16}$/.test(ktpNumber)) return json({ error: 'KTP must be 16 digits' }, 400);

        const { data: existing } = await db
          .from('sp_agent_agreements')
          .select('id')
          .eq('agent_id', caller.authId)
          .eq('doc_version', 'v1.0-2026')
          .maybeSingle();
        if (existing) return json({ error: 'ALREADY_ACCEPTED' }, 409);

        const { data: agreement, error: agErr } = await db
          .from('sp_agent_agreements')
          .insert({
            agent_id: caller.authId,
            doc_version: 'v1.0-2026',
            full_name: fullName,
            ktp_number: ktpNumber,
            user_agent: String(params.user_agent ?? '').slice(0, 255) || null,
          })
          .select()
          .single();
        if (agErr) {
          console.error('accept_agreement error:', agErr);
          return json({ error: agErr.message }, 400);
        }
        return json({ data: agreement });
      }

    case 'get_my_agreement': {
        if (!caller.spUser) return json({ data: null });
        const { data: ag } = await db
          .from('sp_agent_agreements')
          .select('*')
          .eq('agent_id', caller.authId)
          .eq('doc_version', 'v1.0-2026')
          .maybeSingle();
        return json({ data: ag ?? null });
      }

    case 'ensure_profile': {
        if (caller.spUser) return json({ data: caller.spUser });
        const meta = (caller.userMetadata ?? {}) as Record<string, unknown>;
        const reqRole = String(params.role ?? meta.role ?? 'CUSTOMER').toUpperCase();
        const role = reqRole === 'AGENT' ? 'AGENT' : 'CUSTOMER';
        const insertRow: Record<string, unknown> = {
          id: caller.authId,
          email: caller.email,
          name: String(params.name ?? meta.name ?? caller.email.split('@')[0]),
          phone: String(params.phone ?? meta.phone ?? ''),
          ktp: params.ktp ?? meta.ktp ?? null,
          address: params.address ?? meta.address ?? null,
          role,
          trust_score: role === 'AGENT' ? 80 : 85,
          // Nobody is auto-verified anymore — every role goes through the
          // identity_status workflow (UNSUBMITTED -> PENDING -> APPROVED/REJECTED)
          // via submit_identity_verification + admin_review_identity_verification.
          verified: false,
          identity_status: 'UNSUBMITTED',
          agent_code: role === 'AGENT'
            ? 'SP-AGT-' + String(Math.floor(1000 + Math.random() * 9000))
            : 'SP-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0'),
        };
        if (role === 'AGENT') {
          insertRow.commission_rate = 0.1;
          insertRow.monthly_target = 50000000;
        }
        // Referral linkage — code travels in signup metadata (survives the
        // email-confirmation flow, even on another device) or explicit param.
        // Matches the upline's agent_code OR referral_code.
        // SECURITY: sanitize the ref code before interpolating into a PostgREST
        // .or() string — otherwise a value like "xyz,id.eq.<admin_uuid>" would
        // extend the filter and match arbitrary rows (filter injection).
        const rawRefCode = String(params.referral_code ?? meta.referral_code ?? '').trim();
        const refCode = rawRefCode.replace(/[^A-Za-z0-9-]/g, '').slice(0, 32);
        if (refCode) {
          // SECURITY: refCode is sanitized (alphanumeric + dash only, max 32 chars)
          // so it's safe to interpolate into the PostgREST .or() string filter.
          // The array form .or([{...}, {...}]) is NOT supported by the Supabase
          // JS client — it only accepts a string. Using the array form causes a
          // silent crash that breaks registration.
          const { data: upline } = await db
            .from('sp_users')
            .select('id')
            .or(`agent_code.eq.${refCode},referral_code.eq.${refCode}`)
            .neq('id', caller.authId)
            .maybeSingle();
          if (upline) insertRow.upline_id = upline.id;
        }
        const { data, error } = await db.from('sp_users').insert(insertRow).select().single();
        if (error) return json({ error: error.message }, 400);
        // Auto-notify admins of new registration (non-blocking, best-effort)
        const roleLabel = role === 'AGENT' ? 'Agen' : 'Customer';
        db.from('sp_admin_notifications').insert({
          type: `NEW_${role}`,
          title: `${roleLabel} Baru Mendaftar`,
          body: `${String(insertRow.name)} (${caller.email}) baru saja mendaftar sebagai ${roleLabel.toLowerCase()}.`,
          read: false,
          metadata: { user_id: (data as any).id, role, email: caller.email },
        }).then(() => {}, () => {});
        // Telegram push to admin team
        const tgTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        sendTelegram(
          `Akun ${roleLabel} Baru - SurePath\n\n` +
          `Nama: ${String(insertRow.name)}\n` +
          `Email: ${caller.email}\n` +
          `HP: ${String(insertRow.phone) || '-'}\n` +
          `Waktu: ${tgTime} WIB\n\n` +
          `Buka Admin Panel: https://myinsurepath.com/admin`
        );
        return json({ data });
      }

    case 'apply_referral': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        // SECURITY: sanitize the code — PostgREST .or() string interpolation
        // is otherwise vulnerable to filter injection.
        const rawCode = String(params.code ?? '').trim();
        const code = rawCode.replace(/[^A-Za-z0-9-]/g, '').slice(0, 32);
        if (!code) return json({ error: 'Missing code' }, 400);
        if (caller.spUser.upline_id) return json({ data: { upline_id: caller.spUser.upline_id, already_set: true } });
        const { data: upline, error: lookupErr } = await db
          .from('sp_users')
          .select('id')
          .or(`agent_code.eq.${code},referral_code.eq.${code}`)
          .neq('id', caller.spUser.id)
          .maybeSingle();
        if (lookupErr) return json({ error: lookupErr.message }, 400);
        if (!upline) return json({ error: 'Invalid referral code' }, 404);
        const { error } = await db
          .from('sp_users')
          .update({ upline_id: upline.id, updated_at: new Date().toISOString() })
          .eq('id', caller.spUser.id);
        if (error) return json({ error: error.message }, 400);
        return json({ data: { upline_id: upline.id } });
      }

    case 'list_my_clients': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const agentId = caller.isAdmin && params.agent_id ? params.agent_id : caller.spUser.id;
        const { data, error } = await db.from('sp_clients').select('*').eq('agent_id', agentId);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'update_fcm_token': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const token = String(params.token ?? '').trim();
        if (!token) return json({ error: 'Missing token' }, 400);
        const { error: updErr } = await db
          .from('sp_users')
          .update({ fcm_token: token, updated_at: new Date().toISOString() })
          .eq('id', caller.spUser.id);
        if (updErr) return json({ error: updErr.message }, 400);
        return json({ data: { ok: true } });
      }

    case 'update_my_profile': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const SAFE = ['name', 'phone', 'address', 'profile_photo_url', 'ktp_document_url'];
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of SAFE) {
          if (k in params) updates[k] = params[k];
        }
        const { data, error } = await db.from('sp_users').update(updates).eq('id', caller.spUser.id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'get_user_profile': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const targetId = params.user_id ? String(params.user_id) : caller.spUser.id;
        if (targetId !== caller.spUser.id && !caller.isAdmin) return json({ error: 'Forbidden' }, 403);
        const { data, error } = await db.from('sp_users').select('id, email, name, phone, role, agent_code, tier, verified, commission_rate, created_at').eq('id', targetId).maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'record_tc_acceptance': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const refNumber = `TC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
        const { error: tcErr } = await db.from('sp_tnc_records').insert({
          user_id: caller.spUser.id,
          reference_number: refNumber,
          tnc_version: String(params.tnc_version ?? 'v1.0'),
          accepted_at: new Date().toISOString(),
        });
        if (tcErr) return json({ error: tcErr.message }, 400);
        // Update sp_users tc_accepted fields
        await db.from('sp_users').update({
          tc_accepted: true,
          tc_accepted_at: new Date().toISOString(),
          tnc_ref_number: refNumber,
        }).eq('id', caller.spUser.id);
        return json({ data: { reference_number: refNumber } });
      }

    // ── Identity verification (KYC) ────────────────────────────────────────
    // Every role (customer + agent) now goes through the same workflow:
    // UNSUBMITTED -> PENDING (KTP uploaded, submit_identity_verification) ->
    // APPROVED/REJECTED (admin_review_identity_verification). `verified`
    // stays the single flag the rest of the app reads; identity_status adds
    // the missing PENDING state + audit trail.
    case 'submit_identity_verification': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const ktpUrl = String(params.ktp_document_url ?? '').trim();
        if (!ktpUrl) return json({ error: 'ktp_document_url required' }, 400);
        const { data, error } = await db.from('sp_users').update({
          ktp_document_url: ktpUrl,
          identity_status: 'PENDING',
          identity_submitted_at: new Date().toISOString(),
          identity_reject_reason: null,
          updated_at: new Date().toISOString(),
        }).eq('id', caller.spUser.id).select('id, name, email, role, identity_status').maybeSingle();
        if (error) return json({ error: error.message }, 400);
        db.from('sp_admin_notifications').insert({
          type: 'IDENTITY_SUBMITTED',
          title: 'Verifikasi Identitas Baru',
          body: `${String(caller.spUser.name)} (${caller.email}) mengirim dokumen KTP untuk direview.`,
          read: false,
          metadata: { user_id: caller.spUser.id, role: caller.spUser.role },
        }).then(() => {}, () => {});
        return json({ data });
      }

    case 'mark_phone_verified': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const phone = String(params.phone ?? '').trim();
        if (!/^62[0-9]{8,15}$/.test(phone)) return json({ error: 'Invalid phone' }, 400);
        const { data, error } = await db.from('sp_users').update({
          phone,
          phone_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', caller.spUser.id).select('id, phone, phone_verified_at').maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_list_identity_verifications': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const status = String(params.status ?? 'PENDING').toUpperCase();
        let q = db.from('sp_users')
          .select('id, name, email, phone, role, ktp, ktp_document_url, identity_status, identity_submitted_at, identity_reviewed_at, identity_reject_reason, phone_verified_at, tc_accepted, created_at')
          .order('identity_submitted_at', { ascending: false, nullsFirst: false })
          .limit(Number(params.limit ?? 200));
        if (status !== 'ALL') q = q.eq('identity_status', status);
        if (params.role) q = q.eq('role', String(params.role));
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_review_identity_verification': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const targetId = String(params.user_id ?? '');
        if (!targetId) return json({ error: 'user_id required' }, 400);
        const approve = params.action === 'APPROVE';
        const reject = params.action === 'REJECT';
        if (!approve && !reject) return json({ error: 'action must be APPROVE or REJECT' }, 400);
        const reason = String(params.reason ?? '').trim();
        if (reject && !reason) return json({ error: 'reason required to reject' }, 400);

        const { data, error } = await db.from('sp_users').update({
          identity_status: approve ? 'APPROVED' : 'REJECTED',
          verified: approve,
          identity_reviewed_by: caller.authId,
          identity_reviewed_at: new Date().toISOString(),
          identity_reject_reason: reject ? reason : null,
          updated_at: new Date().toISOString(),
        }).eq('id', targetId).select('id, name, email, role, identity_status, verified').maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data) return json({ error: 'User not found' }, 404);

        db.from('sp_admin_notifications').insert({
          type: approve ? 'IDENTITY_APPROVED' : 'IDENTITY_REJECTED',
          title: approve ? 'Identitas Diverifikasi' : 'Identitas Ditolak',
          body: `${String((data as any).name)} (${String((data as any).email)}) ${approve ? 'telah diverifikasi' : 'ditolak: ' + reason}.`,
          read: false,
          metadata: { user_id: targetId, approved: approve, reviewer_id: caller.authId },
        }).then(() => {}, () => {});
        db.from('sp_notifications').insert({
          agent_id: targetId,
          type: approve ? 'IDENTITY_APPROVED' : 'IDENTITY_REJECTED',
          title: approve ? 'Identitas Anda Diverifikasi' : 'Verifikasi Identitas Ditolak',
          body: approve
            ? 'Selamat! Identitas Anda telah diverifikasi. Anda sekarang dapat membeli polis dan mengajukan klaim.'
            : `Maaf, dokumen KTP Anda ditolak. Alasan: ${reason}. Silakan kirim ulang dokumen yang valid.`,
          read: false,
          metadata: { approved: approve, reviewer_id: caller.authId },
        }).then(() => {}, () => {});
        return json({ data });
      }

    // ── T&C acceptance records (audit visibility for admin/operator) ───────
    case 'admin_list_tnc_records': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const search = String(params.search ?? '').trim().toLowerCase();
        const { data: records, error } = await db.from('sp_tnc_records')
          .select('id, user_id, reference_number, tnc_version, accepted_at, user_agent')
          .order('accepted_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
        if (error) return json({ error: error.message }, 400);
        const userIds = [...new Set((records ?? []).map((r: any) => r.user_id))];
        let users: any[] = [];
        if (userIds.length > 0) {
          const { data: userRows } = await db.from('sp_users').select('id, name, email, role').in('id', userIds);
          users = userRows ?? [];
        }
        const userMap: Record<string, any> = {};
        for (const u of users) userMap[u.id] = u;
        let result = (records ?? []).map((r: any) => ({ ...r, user: userMap[r.user_id] ?? null }));
        if (search) {
          result = result.filter((r: any) =>
            String(r.user?.name ?? '').toLowerCase().includes(search) ||
            String(r.user?.email ?? '').toLowerCase().includes(search) ||
            String(r.reference_number ?? '').toLowerCase().includes(search));
        }
        return json({ data: result });
      }

    default:
      return null; // Not handled by this module
  }
}
