// users.ts — 10 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';
import { isUntrustedEmail } from '../../_shared/trust.ts';
import { linkOrdersToNewCustomer } from './clientLink.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

export async function handleUsersAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  // Only the context fields this module actually uses. The generated split
  // destructured all of them; the unused names are dead weight (and tsc flags
  // them now that the unit tests pull this module into the type program).
  const { db, params, caller, sendTelegram } = ctx;

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
          .in('agent_id', caller.ownerIds)
          .eq('doc_version', 'v1.0-2026')
          .maybeSingle();
        if (existing) return json({ error: 'ALREADY_ACCEPTED' }, 409);

        const { data: agreement, error: agErr } = await db
          .from('sp_agent_agreements')
          .insert({
            agent_id: caller.ownerId,
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
          .in('agent_id', caller.ownerIds)
          .eq('doc_version', 'v1.0-2026')
          .maybeSingle();
        return json({ data: ag ?? null });
      }

    case 'ensure_profile': {
        // ROLE STICKINESS INVARIANT (v1.52.0):
        // Once a user has a profile row, their role is IMMUTABLE through this
        // endpoint. If the client sends a role param that disagrees with the
        // stored role, we ignore the param and return the stored profile.
        // The only path to change a role is admin_update_user (audited).
        //
        // FIX v1.49.2: Handle Google OAuth login for existing users.
        // When a user registers with email/password, sp_users.id = auth.users.id.
        // When they later login with Google, Supabase creates a NEW auth.users.id
        // (different UUID). The .or(id, email) lookup in index.ts should find
        // the existing row by email, but if it doesn't (case sensitivity, timing),
        // we need to explicitly look up by email and UPDATE the id to match
        // the new auth ID, rather than INSERTING a duplicate row.
        const reqRoleRaw = String(params.role ?? '').toUpperCase();

        if (caller.spUser) {
          if (reqRoleRaw && reqRoleRaw !== String(caller.spUser.role ?? '').toUpperCase()) {
            console.warn(
              `[ensure_profile] role-change attempt ignored — user=${caller.authId} ` +
              `stored=${caller.spUser.role} requested=${reqRoleRaw} email=${caller.email}`
            );
          }
          return json({ data: caller.spUser, existed: true });
        }

        // Pertahanan berlapis — HANYA untuk profil baru.
        //
        // Sengaja diletakkan SESUDAH cabang "profil sudah ada" di atas.
        // ensure_profile dipanggil di SETIAP login, jadi menolak lebih awal
        // akan mengunci enam akun berdomain mencurigakan yang sudah terlanjur
        // ada di produksi — pengguna lama tidak boleh terdampak, prinsip yang
        // sama dengan grandfathering di _shared/trust.ts.
        //
        // Validasi di klien bisa dilewati dengan memanggil API langsung, jadi
        // pendaftaran baru tetap diperiksa di sini.
        if (isUntrustedEmail(caller.email)) {
          return json({
            error: 'Gunakan alamat email sungguhan — domain tersebut tidak bisa menerima email.',
            code: 'UNTRUSTED_EMAIL_DOMAIN',
          }, 403);
        }

        // Explicit email lookup — case insensitive
        const { data: existingByEmail } = await db.from('sp_users')
          .select('*')
          .ilike('email', caller.email)
          .maybeSingle();

        if (existingByEmail) {
          if (reqRoleRaw && reqRoleRaw !== String(existingByEmail.role ?? '').toUpperCase()) {
            console.warn(
              `[ensure_profile] role-change attempt ignored (by-email) — user=${caller.authId} ` +
              `stored=${existingByEmail.role} requested=${reqRoleRaw} email=${caller.email}`
            );
          }
          // User already exists (registered with email/password, now logging
          // in with Google). Update their auth ID to the new Google auth ID
          // so future lookups work correctly. Preserve all existing data,
          // ESPECIALLY the role — never touch it here.
          const { data: updated, error: updErr } = await db.from('sp_users')
            .update({
              id: caller.authId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingByEmail.id)
            .select()
            .maybeSingle();

          if (updErr) {
            // If update fails (e.g. FK constraint), return the existing profile
            // with the old ID — the app will still work for this session
            console.warn('ensure_profile: failed to update auth ID:', updErr.message);
            return json({ data: existingByEmail, existed: true });
          }
          if (updated) return json({ data: updated, existed: true });
          return json({ data: existingByEmail, existed: true });
        }

        // No existing user — create new profile.
        //
        // The account type must be stated, never assumed. This used to fall
        // back to 'CUSTOMER' when neither the caller nor the signup metadata
        // named a role, so any client that called ensure_profile without one
        // silently minted a customer — which is exactly how brand-new Google/
        // OTP signups skipped the account-type picker and landed in the
        // customer app. Refusing here keeps that from being reintroduced by a
        // future caller; the client is expected to answer with a role
        // (RoleSelectionScreen) and call again.
        const meta = (caller.userMetadata ?? {}) as Record<string, unknown>;
        const metaRoleRaw = String(meta.role ?? '').toUpperCase();
        const reqRole = reqRoleRaw || metaRoleRaw;
        if (!reqRole) {
          return json({
            error: 'ROLE_REQUIRED: account type must be chosen before a profile can be created',
            code: 'ROLE_REQUIRED',
          }, 409);
        }
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
          verified: role !== 'AGENT',
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

        // ── Polis yang sudah dijual sebelum nasabahnya punya akun ──────────
        //
        // Agen menjual, nasabah mendaftar belakangan. Tanpa langkah ini
        // ordernya tetap tidak bertuan dan /custapp-nya kosong meski polisnya
        // ada. Emailnya dari sesi yang sudah diverifikasi, bukan dari params,
        // dan hanya order yang belum bertuan yang disentuh — aturan lengkapnya
        // di clientLink.ts.
        let linkedOrders = 0;
        if (role === 'CUSTOMER') {
          linkedOrders = await linkOrdersToNewCustomer(db, String((data as any).id), caller.email);
          if (linkedOrders > 0) {
            console.log(`[ensure_profile] ${linkedOrders} order ditautkan ke nasabah baru ${(data as any).id}`);
          }
        }

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
        return json({ data, existed: false, linked_orders: linkedOrders });
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

    default:
      return null; // Not handled by this module
  }
}
