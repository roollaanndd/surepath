// Shared CORS helper for SurePath edge functions.
// Replaces the blanket `Access-Control-Allow-Origin: *` with an allowlist so
// only first-party origins can invoke authenticated/sensitive functions from a browser.
//
// Webhooks (e.g. Xendit) are server-to-server and ignore CORS, so they are unaffected.

const ALLOWED_ORIGINS = [
  'https://myinsurepath.com',
  'https://www.myinsurepath.com',
];

// Vercel preview deployments: https://<project>-<hash>-<scope>.vercel.app
const PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
// Local development
const LOCAL_RE = /^http:\/\/localhost(:\d+)?$/i;

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
