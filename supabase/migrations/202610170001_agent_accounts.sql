-- Listory: account ownership. Run after supabase/setup.sql in Supabase SQL Editor.
-- Additive/backward-safe: no listings, images, URLs or existing keys are deleted.
-- Legacy rows deliberately remain unassigned until an explicit verified claim.
begin;
alter table public.listory_properties
  add column if not exists owner_id uuid references auth.users(id) on delete restrict;
alter table public.listory_properties alter column management_hash drop not null;
create index if not exists listory_properties_owner_idx
  on public.listory_properties(owner_id, updated_at desc);

create table if not exists public.listory_agent_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  brand jsonb not null default '{}'::jsonb check (jsonb_typeof(brand) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.listory_agent_profiles enable row level security;
alter table public.listory_properties enable row level security;

-- Direct anonymous access is intentionally closed. Public property pages are
-- served by the existing server, which selects only published public artwork.
revoke all on public.listory_agent_profiles from anon, authenticated;
revoke all on public.listory_properties from anon, authenticated;
grant select, insert, update, delete on public.listory_agent_profiles to authenticated;
grant select (slug, status, listing, brand, sample, owner_id, updated_at)
  on public.listory_properties to authenticated;
grant insert (slug, status, listing, brand, sample, owner_id, updated_at)
  on public.listory_properties to authenticated;
grant update (status, listing, brand, sample, updated_at)
  on public.listory_properties to authenticated;
grant delete on public.listory_properties to authenticated;
grant all on public.listory_properties, public.listory_agent_profiles to service_role;

drop policy if exists listory_profile_owner on public.listory_agent_profiles;
create policy listory_profile_owner on public.listory_agent_profiles
  for all to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists listory_listing_read on public.listory_properties;
create policy listory_listing_read on public.listory_properties
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists listory_listing_insert on public.listory_properties;
create policy listory_listing_insert on public.listory_properties
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists listory_listing_update on public.listory_properties;
create policy listory_listing_update on public.listory_properties
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists listory_listing_delete on public.listory_properties;
create policy listory_listing_delete on public.listory_properties
  for delete to authenticated using (owner_id = (select auth.uid()));

-- A legacy key is only a one-time proof of possession, never a login or an
-- authorization mechanism for normal management. The caller MUST be signed in.
-- Atomic UPDATE means two accounts cannot both claim the same listing.
create or replace function public.listory_claim_legacy_property(p_slug text, p_token text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare agent uuid := auth.uid();
begin
  if agent is null or p_slug is null or p_slug !~ '^[a-z0-9-]{1,110}$'
     or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Unable to connect this legacy property.' using errcode = '42501';
  end if;
  -- Idempotent retry by the same verified owner is safe.
  if exists (select 1 from public.listory_properties where slug = p_slug and owner_id = agent) then return; end if;
  update public.listory_properties
     set owner_id = agent, management_hash = null, updated_at = now()
   where slug = p_slug and owner_id is null
     and management_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then
    raise exception 'Unable to connect this legacy property.' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.listory_claim_legacy_property(text, text) from public, anon;
grant execute on function public.listory_claim_legacy_property(text, text) to authenticated;
commit;
