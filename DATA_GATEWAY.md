# data-gateway — Edge Function Reference
> Supabase Edge Function · v8 · Project `uyjgeteelnswphyzkjwi`

---

## Overview

`data-gateway` is the primary Supabase Edge Function for the SurePath platform. It handles inbound API requests from the frontend and fires push notifications inline on key events.

**Deployed version:** v8  
**Region:** ap-southeast-1 (Singapore)

---

## Notification Actions

Notifications are fired **inline** (not via a separate worker) within the same function invocation.

| Trigger | Action |
|---------|--------|
| New user registration | `sendTelegram()` + `sendInsurerEmail()` to admin |
| New policy order (`sp_policy_orders` insert) | `sendTelegram()` + `sendInsurerEmail()` to admin |

---

## Helper Functions

### `sendTelegram(message: string)`

Posts a text message to the configured Telegram admin group.

**Secrets required:**
- `TELEGRAM_BOT_TOKEN` — bot token from BotFather
- `TELEGRAM_ADMIN_CHAT_ID` — target group or chat ID

**Behaviour:**
- Uses Telegram Bot API `sendMessage` method
- Fires and awaits — errors are logged but do not abort the main request

---

### `sendInsurerEmail(to: string, subject: string, html: string)`

Sends an HTML email via Resend.

**Secrets required:**
- `RESEND_API_KEY` — Resend API key

**Behaviour:**
- POST to `https://api.resend.com/emails`
- `from` address configured per Resend domain setup
- Errors are logged but do not abort the main request

---

## Required Supabase Secrets

All secrets are set via Supabase Dashboard → Edge Functions → Secrets (not in `.env`):

| Secret | Used By |
|--------|---------|
| `TELEGRAM_BOT_TOKEN` | `sendTelegram` |
| `TELEGRAM_ADMIN_CHAT_ID` | `sendTelegram` |
| `RESEND_API_KEY` | `sendInsurerEmail` |
| `SUPABASE_SERVICE_ROLE_KEY` | DB admin operations |
| `SUPABASE_ANON_KEY` | Public client operations |

---

## Related Edge Functions

| Function | Purpose |
|----------|---------|
| `notify-admin` | Watches `sp_policy_orders` inserts; triggers admin in-app notifications |
| `send-insurer-email` | Admin-triggered endpoint — sends HTML emails to insurers via Resend |

---

*Last updated: June 2026 · SurePath Engineering*
