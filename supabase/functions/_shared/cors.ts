// Shared CORS helper for SurePath edge functions.
// Replaces the blanket `Access-Control-Allow-Origin: *` with an allowlist so
// only first-party origins can invoke authenticated/sensitive functions from a browser.
//
// Webhooks (e.g. Xendit) are server-to-server and ignore CORS, so they are unaffected.

const ALLOWED_ORIGINS = [
  'https://myinsurepath.com',
  'https://www.myinsurepath.com',
];

// Vercel preview deployments: https://<project>-<hash>-roollaanndds-projects.vercel.app
// Scoped to this account's team slug — matching any *.vercel.app would let
// someone else's Vercel project (any account can deploy one) satisfy this
// allowlist, since preview subdomains aren't otherwise attacker-unguessable.
const PREVIEW_RE = /^https:\/\/[a-z0-9-]+-roollaanndds-projects\.vercel\.app$/i;
// Local development + Capacitor native app (Android uses https://localhost,
// iOS uses capacitor://localhost — both must be allowed or the native app
// gets CORS-blocked from every edge function except data-gateway which has
// its own inlined CORS)
const LOCAL_RE = /^(https?|capacitor):\/\/localhost(:\d+)?$/i;

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_RE.test(origin) || LOCAL_RE.test(origin))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
