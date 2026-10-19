-- Run after the account/portfolio migrations. No publication dates are inferred
-- from updated_at: legacy published homes remain public, but are Past/undated.
begin;
alter table public.listory_properties
 add column if not exists first_published_at timestamptz,
 add column if not exists current_until timestamptz,
 add column if not exists publication_date_unknown boolean not null default false;
-- Only first installation marks legacy rows. Re-running never dates them today.
update public.listory_properties set publication_date_unknown=true
 where status='published' and first_published_at is null and not publication_date_unknown;
grant select(first_published_at,current_until,publication_date_unknown) on public.listory_properties to authenticated;
create or replace function public.listory_publication_dates() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin
 if tg_op='UPDATE' then
  -- Once known (or marked unknown for legacy homes), publication history survives
  -- edits, unpublishing, republishing, claiming and promotion extensions.
  new.first_published_at=old.first_published_at;
  new.publication_date_unknown=old.publication_date_unknown;
  -- current_until is not granted for direct authenticated writes. The locked,
  -- owner-scoped extension function below is the only client path to changing it.
 else
  new.first_published_at=null;
  new.current_until=null;
  new.publication_date_unknown=false;
 end if;
 if new.status='published' and new.first_published_at is null and not new.publication_date_unknown then
  new.first_published_at=statement_timestamp();
  new.current_until=new.first_published_at+interval '720 hours';
 end if;
 return new;
end;$$;
revoke all on function public.listory_publication_dates() from public,anon,authenticated;
drop trigger if exists listory_publication_dates on public.listory_properties;
create trigger listory_publication_dates before insert or update on public.listory_properties
 for each row execute function public.listory_publication_dates();
create index if not exists listory_fresh_publication_idx on public.listory_properties(first_published_at desc,slug) where status='published' and owner_id is not null;
-- SECURITY DEFINER is narrowly scoped: no arbitrary values, only 30 days added
-- atomically to an owned published home's existing unexpired promotion period.
create or replace function public.listory_extend_listing(p_slug text,p_expected_current_until timestamptz)
returns timestamptz language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare expiry timestamptz;
begin
 if auth.uid() is null then raise exception 'Sign in to extend a listing.' using errcode='42501'; end if;
 update public.listory_properties set current_until=current_until+interval '720 hours',updated_at=statement_timestamp()
 where slug=p_slug and owner_id=auth.uid() and status='published'
 and current_until>statement_timestamp() and current_until=p_expected_current_until
 returning current_until into expiry;
 if not found then raise exception 'This listing has changed or is no longer Current. Refresh your listings.' using errcode='40001'; end if;
 return expiry;
end;$$;
revoke all on function public.listory_extend_listing(text,timestamptz) from public,anon;
grant execute on function public.listory_extend_listing(text,timestamptz) to authenticated;
-- Server-only projection: anonymous direct access remains closed. The auth.users
-- join excludes unowned/deleted-owner rows without sending account IDs to pages.
create or replace view public.listory_fresh_listings as
 select p.slug,p.first_published_at,p.current_until,
 p.listing->>'address' as address,p.listing->>'price' as price,
 p.listing->>'bedrooms' as bedrooms,p.listing->>'bathrooms' as bathrooms,
 p.listing->>'squareFootage' as "squareFootage",p.listing->'photos'->0 as photo,
 concat_ws(' ',nullif(p.brand->>'firstName',''),nullif(p.brand->>'lastName','')) as agent_name,
 case when a.portfolio_published then a.portfolio_slug else null end as agent_slug
 from public.listory_properties p join auth.users u on u.id=p.owner_id
 left join public.listory_agent_profiles a on a.id=p.owner_id
 where u.email_confirmed_at is not null and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=statement_timestamp()) and not coalesce(u.is_anonymous,false)
 and p.status='published' and p.first_published_at>statement_timestamp()-interval '168 hours'
 and p.first_published_at<=statement_timestamp() and p.current_until>statement_timestamp();
revoke all on public.listory_fresh_listings from public,anon,authenticated;
grant select on public.listory_fresh_listings to service_role;
-- Dormant featured flags are preserved, but Past homes do not consume active slots.
create or replace function public.listory_limit_featured() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.portfolio_featured and not old.portfolio_featured then
  if new.owner_id is null or new.status<>'published' or new.current_until is null or new.current_until<=statement_timestamp() then raise exception 'Choose a Current listing to feature.' using errcode='23514'; end if;
  perform id from public.listory_agent_profiles where id=new.owner_id for update;
  if not found then raise exception 'Save your Brand Profile first.' using errcode='23514'; end if;
  if (select count(*) from public.listory_properties where owner_id=new.owner_id and portfolio_featured and status='published' and current_until>statement_timestamp() and slug<>new.slug)>=6 then raise exception 'Choose up to six Current featured listings.' using errcode='23514'; end if;
 end if;
 return new;
end;$$;
notify pgrst,'reload schema';
commit;
