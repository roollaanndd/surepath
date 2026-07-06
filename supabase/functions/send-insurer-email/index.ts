import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth, adminOnly } from '../_shared/auth.ts';

serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')             ?? '';
  const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')         ?? '';

  // ── Auth: admin only ──────────────────────────────────────────────────────
  const { caller, errorResponse } = await verifyAuth(req, SUPABASE_URL, ANON_KEY, SERVICE_KEY, CORS);
  if (errorResponse) return errorResponse;
  const denied = adminOnly(caller!, CORS);
  if (denied) return denied;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
    if (!RESEND_API_KEY) {
      // Log but don't fail — email is best-effort
      console.warn('RESEND_API_KEY not set, skipping email');
      return json({ success: false, skipped: true, reason: 'RESEND_API_KEY not configured' });
    }

    const {
      to,
      subject,
      order_number,
      client_name,
      product_name,
      total_premium,
      review_url,
      dashboard_url,
      insurer_name,
    } = await req.json() as {
      to: string;
      subject?: string;
      order_number: string;
      client_name: string;
      product_name: string;
      total_premium: number;
      review_url: string;
      dashboard_url: string;
      insurer_name: string;
    };

    if (!to || !order_number || !review_url) {
      return json({ success: false, error: 'Missing required fields: to, order_number, review_url' }, 400);
    }

    // Escape HTML special characters in user-supplied strings before injecting into email HTML
    const esc = (s: string) => s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)
    );

    const emailSubject = subject ?? `Pengajuan Polis Baru: ${order_number} – ${client_name}`;

    const premiumFormatted = new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(total_premium ?? 0);

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${emailSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#0f172a;padding:28px 32px;">
          <table width="100%"><tr>
            <td>
              <span style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">Sure<span style="color:#f97316;">Path</span></span>
              <span style="display:block;font-size:10px;font-weight:700;color:#64748b;letter-spacing:3px;text-transform:uppercase;margin-top:2px;">Insurer Portal</span>
            </td>
            <td align="right">
              <span style="background:#f97316;color:#ffffff;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:20px;">Pengajuan Baru</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="font-size:14px;color:#64748b;margin:0 0 8px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Kepada Tim ${esc(insurer_name ?? 'Penanggung')}</p>
          <h1 style="font-size:26px;font-weight:900;color:#0f172a;margin:0 0 24px;letter-spacing:-1px;line-height:1.2;">Terdapat pengajuan polis<br/>baru yang perlu ditinjau</h1>

          <!-- Order Card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">No. Order</td>
                  <td align="right" style="padding:6px 0;font-size:13px;font-weight:800;color:#f97316;font-family:monospace;">${esc(order_number)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Nasabah</td>
                  <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(client_name)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Produk</td>
                  <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(product_name)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;border-top:1px solid #e2e8f0;">Total Premi</td>
                  <td align="right" style="padding:6px 0;font-size:16px;font-weight:900;color:#f97316;border-top:1px solid #e2e8f0;">${premiumFormatted}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA Buttons -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td width="48%" align="center">
                <a href="${review_url}" style="display:block;background:#0f172a;color:#ffffff;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:16px 20px;border-radius:12px;text-align:center;">Review Order Ini</a>
              </td>
              <td width="4%"></td>
              <td width="48%" align="center">
                <a href="${dashboard_url}" style="display:block;background:#f97316;color:#ffffff;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:16px 20px;border-radius:12px;text-align:center;">Dashboard Saya</a>
              </td>
            </tr>
          </table>

          <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6;">
            Link review berlaku 7 hari. Link dashboard berlaku 24 jam dan akan login otomatis ke portal Anda.<br/>
            Jangan teruskan email ini ke pihak lain.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
          <table width="100%"><tr>
            <td style="font-size:11px;color:#94a3b8;font-weight:600;">SurePath Insurance Platform</td>
            <td align="right" style="font-size:11px;color:#94a3b8;">myinsurepath.com</td>
          </tr></table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SurePath <noreply@myinsurepath.com>',
        to: [to],
        subject: emailSubject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend error:', res.status, errText);
      return json({ success: false, error: `Resend API error ${res.status}: ${errText}` }, 500);
    }

    const data = await res.json();
    return json({ success: true, email_id: data.id });

  } catch (err) {
    console.error('send-insurer-email error:', err);
    return json({ success: false, error: String(err) }, 500);
  }
});
