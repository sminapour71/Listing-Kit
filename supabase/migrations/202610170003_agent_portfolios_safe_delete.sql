-- Additive: preserves existing listings, branding, URLs and Open Houses.
begin;
alter table public.listory_agent_profiles
 add column if not exists portfolio_slug text unique,
 add column if not exists portfolio_bio text not null default '',
 add column if not exists portfolio_subareas text[] not null default '{}',
 add column if not exists portfolio_published boolean not null default false;
create table if not exists public.listory_agent_slugs (
 slug text primary key,
 owner_id uuid not null references public.listory_agent_profiles(id) on delete cascade
);
alter table public.listory_agent_slugs enable row level security;
revoke all on public.listory_agent_slugs from anon, authenticated;
grant select on public.listory_agent_slugs to authenticated;
grant all on public.listory_agent_slugs to service_role;
drop policy if exists listory_slug_owner on public.listory_agent_slugs;
create policy listory_slug_owner on public.listory_agent_slugs for select to authenticated using(owner_id=(select auth.uid()));
create or replace function public.listory_validate_portfolio() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.portfolio_slug is not null and (length(new.portfolio_slug) not between 2 and 80 or new.portfolio_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or new.portfolio_slug ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$') then raise exception 'Choose a clean name-based portfolio address.' using errcode='23514'; end if;
 if length(new.portfolio_bio)>4000 or cardinality(new.portfolio_subareas)>5 or array_ndims(new.portfolio_subareas)>1 or exists(select 1 from unnest(new.portfolio_subareas) s where s is null or length(btrim(s)) not between 1 and 80) or (select count(*) from unnest(new.portfolio_subareas) s)<>(select count(distinct lower(btrim(s))) from unnest(new.portfolio_subareas) s) or (new.portfolio_published and new.portfolio_slug is null) then raise exception 'Check the portfolio biography, address and five subareas.' using errcode='23514'; end if;
 if new.portfolio_slug is not null then
  insert into public.listory_agent_slugs(slug,owner_id) values(new.portfolio_slug,new.id) on conflict do nothing;
  if not exists(select 1 from public.listory_agent_slugs where slug=new.portfolio_slug and owner_id=new.id) then raise exception 'That portfolio address is already reserved.' using errcode='23505'; end if;
 end if;
 return new;
end;$$;
revoke all on function public.listory_validate_portfolio() from public,anon,authenticated;
drop trigger if exists listory_portfolio_validation on public.listory_agent_profiles;
create trigger listory_portfolio_validation after insert or update on public.listory_agent_profiles for each row execute function public.listory_validate_portfolio();

alter table public.listory_properties add column if not exists portfolio_featured boolean not null default false;
grant select(portfolio_featured),update(portfolio_featured) on public.listory_properties to authenticated;
create or replace function public.listory_limit_featured() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.portfolio_featured and not old.portfolio_featured then
  if new.owner_id is null or new.status<>'published' then raise exception 'Publish this listing before featuring it.' using errcode='23514'; end if;
  perform id from public.listory_agent_profiles where id=new.owner_id for update;
  if not found then raise exception 'Save your Brand Profile first.' using errcode='23514'; end if;
  if (select count(*) from public.listory_properties where owner_id=new.owner_id and portfolio_featured and slug<>new.slug)>=6 then raise exception 'Choose up to six featured listings.' using errcode='23514'; end if;
 end if;
 return new;
end;$$;
revoke all on function public.listory_limit_featured() from public,anon,authenticated;
drop trigger if exists listory_feature_limit on public.listory_properties;
create trigger listory_feature_limit before update of portfolio_featured on public.listory_properties for each row execute function public.listory_limit_featured();

-- Reserve deleted URLs so old printed QR codes can never become another home.
-- Contains no listing data, owner identifier or visitor information.
create table if not exists public.listory_deleted_property_slugs(slug text primary key,deleted_at timestamptz not null default now());
alter table public.listory_deleted_property_slugs enable row level security;
revoke all on public.listory_deleted_property_slugs from anon,authenticated;
grant all on public.listory_deleted_property_slugs to service_role;
create or replace function public.listory_reserve_deleted_slug() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if tg_op='DELETE' then insert into public.listory_deleted_property_slugs(slug) values(old.slug) on conflict do nothing; return old; end if;
 if exists(select 1 from public.listory_deleted_property_slugs where slug=new.slug) then raise exception 'This property address was retired.' using errcode='23505'; end if;
 return new;
end;$$;
revoke all on function public.listory_reserve_deleted_slug() from public,anon,authenticated;
drop trigger if exists listory_deleted_slug_reservation on public.listory_properties;
create trigger listory_deleted_slug_reservation after delete on public.listory_properties for each row execute function public.listory_reserve_deleted_slug();
drop trigger if exists listory_deleted_slug_reuse on public.listory_properties;
create trigger listory_deleted_slug_reuse before insert or update of slug on public.listory_properties for each row execute function public.listory_reserve_deleted_slug();

-- Invoker rights + existing owner RLS. Also prevents deleting a stale editor.
-- Existing composite foreign keys cascade to events and their attendees.
create or replace function public.listory_delete_owned_property(p_slug text,p_expected_updated_at timestamptz,p_confirmation text) returns boolean language plpgsql security invoker set search_path=pg_catalog,public,auth as $$
begin
 if auth.uid() is null or p_confirmation is distinct from 'DELETE' then raise exception 'Confirm deletion by typing DELETE.' using errcode='42501'; end if;
 delete from public.listory_properties where slug=p_slug and owner_id=auth.uid() and updated_at=p_expected_updated_at;
 return found;
end;$$;
revoke all on function public.listory_delete_owned_property(text,timestamptz,text) from public,anon;
grant execute on function public.listory_delete_owned_property(text,timestamptz,text) to authenticated;
commit;
