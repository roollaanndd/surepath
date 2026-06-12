# SurePath — Deployment Reference
> Production: https://myinsurepath.com

---

## Vercel (Frontend)

Pushing to `main` triggers automatic production deployment.

```
git push origin main
```

**Project:** `prj_MLYVdGeboOTxAO5s0Xf2cwLDGohu`  
**Team:** `team_afNqJ8H0darvhUlxlzTjzrjm`

### Vercel Environment Variables

Set in Vercel Dashboard → Project Settings → Environment Variables.

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_ADMIN_KEY` | Master admin password seed | Yes |
| `VITE_OPENROUTER_KEY` | OpenRouter API key (all AI features) | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Yes |

---

## Supabase (Backend)

**Project:** `uyjgeteelnswphyzkjwi`  
**Region:** ap-southeast-1 (Singapore)  
**Dashboard:** https://supabase.com/dashboard/project/uyjgeteelnswphyzkjwi

### Edge Function Deploy

```bash
supabase functions deploy data-gateway --project-ref uyjgeteelnswphyzkjwi
supabase functions deploy notify-admin --project-ref uyjgeteelnswphyzkjwi
supabase functions deploy send-insurer-email --project-ref uyjgeteelnswphyzkjwi
```

### Supabase Secrets Setup

Secrets are stored in Supabase and injected into Edge Functions at runtime — **never put these in `.env` or Vercel**.

Set via Supabase Dashboard → Edge Functions → Manage secrets, or via CLI:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=<value> --project-ref uyjgeteelnswphyzkjwi
supabase secrets set TELEGRAM_ADMIN_CHAT_ID=<value> --project-ref uyjgeteelnswphyzkjwi
supabase secrets set RESEND_API_KEY=<value> --project-ref uyjgeteelnswphyzkjwi
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<value> --project-ref uyjgeteelnswphyzkjwi
supabase secrets set SUPABASE_ANON_KEY=<value> --project-ref uyjgeteelnswphyzkjwi
```

| Secret | Used By | Notes |
|--------|---------|-------|
| `TELEGRAM_BOT_TOKEN` | `data-gateway`, `notify-admin` | From BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | `data-gateway`, `notify-admin` | Admin group chat ID |
| `RESEND_API_KEY` | `data-gateway`, `send-insurer-email` | From Resend dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | All edge functions | Do NOT expose to frontend |
| `SUPABASE_ANON_KEY` | Edge functions needing public access | Safe for frontend too |

---

## Branch Strategy

| Branch | Environment |
|--------|-------------|
| `main` | Production (`myinsurepath.com`) |
| `claude/insurtech-mobile-app-RvOFd` | Feature development |

---

## Checklist Before Deploy

- [ ] `VITE_ADMIN_KEY` set in Vercel
- [ ] `VITE_OPENROUTER_KEY` set in Vercel
- [ ] All 5 Supabase secrets set
- [ ] Edge functions deployed (data-gateway v8, notify-admin, send-insurer-email)
- [ ] RLS policies verified (17 scoped policies + `is_admin()` helper)
- [ ] `npm run build` passes locally

---

*Last updated: June 2026 · SurePath Engineering*
