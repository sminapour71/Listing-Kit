-- Emergency fallback ONLY if the original browser's proof is lost.
-- Run as the project administrator in Supabase SQL Editor after verifying that
-- the confirmed email below and EACH named property belong to the same person.
-- Replace the email and exact slug(s) yourself. NEVER use a wildcard/all rows.
begin;
do $$
declare
  account_email text := 'REPLACE_WITH_YOUR_CONFIRMED_ACCOUNT_EMAIL';
  property_slugs text[] := array['REPLACE_WITH_ONE_EXACT_PROPERTY_SLUG'];
  agent uuid;
  target text;
begin
  if account_email like 'REPLACE%' or cardinality(property_slugs)=0
     or exists(select 1 from unnest(property_slugs) s where s like 'REPLACE%') then
    raise exception 'Fill in your verified account email and exact property slugs first. Nothing was changed.';
  end if;
  select id into strict agent from auth.users
    where lower(email)=lower(account_email) and email_confirmed_at is not null;
  foreach target in array property_slugs loop
    -- Lock and explicitly refuse to move a listing owned by a different agent.
    perform 1 from public.listory_properties where slug=target
      and (owner_id is null or owner_id=agent) for update;
    if not found then raise exception 'Property % is missing or already belongs to another account. Nothing was changed.',target; end if;
    update public.listory_properties set owner_id=agent,management_hash=null,updated_at=now()
      where slug=target and (owner_id is null or owner_id=agent);
  end loop;
end $$;
commit;
