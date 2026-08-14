-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: audit_critical_update() aborts every UPDATE on sp_payments
--
-- ⚠️  NOT YET APPLIED TO PRODUCTION — needs a human review before it goes out,
--     because it sits on the payment path. See docs/PUBLIC_API.md §9.
--
-- Found while smoke-testing the v1.55.0 webhook triggers. Pre-existing; not
-- caused by the Public API work.
--
-- THE BUG
-- -------
-- `audit_critical_update()` is attached to two tables:
--
--   audit_update_sp_policy_orders  AFTER UPDATE ON sp_policy_orders
--   audit_update_sp_payments       AFTER UPDATE ON sp_payments
--
-- but its guard dereferences four columns unconditionally:
--
--   IF OLD.status            IS DISTINCT FROM NEW.status
--      OR OLD.total_premium     IS DISTINCT FROM NEW.total_premium
--      OR OLD.commission_amount IS DISTINCT FROM NEW.commission_amount
--      OR OLD.discount_amount   IS DISTINCT FROM NEW.discount_amount
--
-- `sp_payments` has none of the last three. In PL/pgSQL a missing record field
-- is a run-time error, not a NULL, so the trigger raises
--
--   42703: record "old" has no field "total_premium"
--
-- and, because it is an AFTER trigger in the same transaction, the UPDATE is
-- rolled back. **Every UPDATE to sp_payments currently fails.**
--
-- WHY NOBODY HAS HIT IT
-- ---------------------
-- `sp_payments` has 0 rows in production. The row is INSERTed by
-- create-xendit-invoice (inserts are unaffected — the trigger is UPDATE-only)
-- and only UPDATEd later by xendit-webhook when the customer actually pays.
-- No one has completed a payment yet, so the landmine has never been stepped
-- on. The first real payment would fail: `xendit-webhook` could not mark the
-- payment PAID, which means the order would not advance and the agent's
-- commission would not be credited.
--
-- THE FIX
-- -------
-- Compare the four critical fields through `to_jsonb()` and skip any that the
-- table does not have. Behaviour on `sp_policy_orders` is unchanged (all four
-- columns are present). On `sp_payments` the guard now reduces to `status`,
-- which is the field worth auditing there anyway.
--
-- `jsonb -> key` returns SQL NULL for an absent key, so the `? key` presence
-- test is what keeps a missing column from reading as "changed to null".
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.audit_critical_update()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  old_j    jsonb := to_jsonb(old);
  new_j    jsonb := to_jsonb(new);
  critical text[] := array['status', 'total_premium', 'commission_amount', 'discount_amount'];
  k        text;
  changed  boolean := false;
begin
  foreach k in array critical loop
    -- Only consider a field the table actually has.
    if (old_j ? k or new_j ? k) and (old_j -> k) is distinct from (new_j -> k) then
      changed := true;
      exit;
    end if;
  end loop;

  if changed then
    insert into public.sp_audit_log (table_name, row_id, action, old_data, new_data, actor_id, session_info)
    values (
      tg_table_name,
      (new.id)::text,
      'UPDATE',
      old_j,
      new_j,
      auth.uid(),
      current_setting('app.user_email', true)
    );
  end if;

  return new;
end;
$function$;
