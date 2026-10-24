-- Persist the customer email captured by agent-created orders.
-- The customer-linking flow must retain this value so a later verified signup
-- can safely attach only an exact, unique email match. Nullable by design:
-- existing orders without a captured email remain unlinked rather than guessed.
alter table public.sp_policy_orders
  add column if not exists client_email text;

comment on column public.sp_policy_orders.client_email is
  'Email nasabah yang dicatat saat order dibuat; dipakai hanya untuk penautan aman setelah signup terverifikasi.';
