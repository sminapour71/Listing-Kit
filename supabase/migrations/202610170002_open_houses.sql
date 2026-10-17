-- Listory Open House sign-in. Additive; run after the agent-account migration.
-- Existing listings, public URLs, photos, profiles and brochure data are untouched.
begin;
create unique index if not exists listory_properties_slug_owner_idx
  on public.listory_properties(slug,owner_id);
create table if not exists public.listory_open_houses (
  id uuid primary key default gen_random_uuid(),
  listing_slug text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  event_date date not null check(event_date between date '2000-01-01' and date '2100-12-31'),
  start_time time not null,
  end_time time not null check(end_time > start_time),
  time_zone text not null default 'America/Vancouver' check(time_zone='America/Vancouver'),
  notes text not null default '' check(char_length(notes)<=2000),
  state text not null default 'open' check(state in ('open','closed')),
  created_at timestamptz not null default now(),
  unique(id,listing_slug,owner_id),
  foreign key(listing_slug,owner_id) references public.listory_properties(slug,owner_id) on delete cascade
);
create index if not exists listory_open_houses_owner_listing_idx
  on public.listory_open_houses(owner_id,listing_slug,event_date desc);
create table if not exists public.listory_open_house_attendees (
  id uuid primary key default gen_random_uuid(),
  open_house_id uuid not null,
  listing_slug text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  first_name text not null check(char_length(btrim(first_name)) between 1 and 100),
  last_name text not null check(char_length(btrim(last_name)) between 1 and 100),
  email text not null check(email=lower(btrim(email)) and char_length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check(char_length(phone)<=40 and char_length(regexp_replace(phone,'[^0-9]','','g')) between 7 and 20),
  working_with_realtor boolean not null,
  buyer_status text not null check(buyer_status in ('browsing','buying','interested','selling','both')),
  notes text not null default '' check(char_length(notes)<=2000),
  consent_version text not null default 'open-house-v1' check(consent_version='open-house-v1'),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  submission_fingerprint text not null check(submission_fingerprint ~ '^[a-f0-9]{64}$'),
  unique(open_house_id,email),
  foreign key(open_house_id,listing_slug,owner_id)
    references public.listory_open_houses(id,listing_slug,owner_id) on delete cascade
);
create index if not exists listory_attendees_owner_event_idx
  on public.listory_open_house_attendees(owner_id,open_house_id,created_at desc,id desc);
create index if not exists listory_attendees_rate_idx
  on public.listory_open_house_attendees(open_house_id,submission_fingerprint,created_at desc);
alter table public.listory_open_houses enable row level security;
alter table public.listory_open_house_attendees enable row level security;
revoke all on public.listory_open_houses,public.listory_open_house_attendees from anon,authenticated;
grant select on public.listory_open_houses,public.listory_open_house_attendees to authenticated;
grant insert(id,listing_slug,owner_id,event_date,start_time,end_time,notes,state)
  on public.listory_open_houses to authenticated;
-- Identity/ownership cannot be changed, even by the authenticated owner.
grant update(event_date,start_time,end_time,notes,state) on public.listory_open_houses to authenticated;
grant delete on public.listory_open_houses to authenticated;
grant all on public.listory_open_houses,public.listory_open_house_attendees to service_role;
drop policy if exists listory_open_house_owner on public.listory_open_houses;
create policy listory_open_house_owner on public.listory_open_houses
  for all to authenticated using(owner_id=(select auth.uid()))
  with check(owner_id=(select auth.uid()) and exists(
    select 1 from public.listory_properties p where p.slug=listing_slug and p.owner_id=(select auth.uid())
  ));
drop policy if exists listory_attendee_owner_read on public.listory_open_house_attendees;
create policy listory_attendee_owner_read on public.listory_open_house_attendees
  for select to authenticated using(owner_id=(select auth.uid()));

-- Public visitors never receive database credentials or direct table access.
-- Only the server may call this restricted function after validating the form.
-- It derives ALL ownership/relationship fields from the locked event/listing.
create or replace function public.listory_submit_open_house(
  p_event_id uuid,p_first_name text,p_last_name text,p_email text,p_phone text,
  p_working_with_realtor boolean,p_buyer_status text,p_notes text,p_consent boolean,p_fingerprint text
) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare event public.listory_open_houses%rowtype;
begin
  if p_consent is distinct from true then
    raise exception 'Please confirm the contact disclosure.' using errcode='22023';
  end if;
  -- A row lock makes capacity/rate checks and insertion atomic across workers.
  select h.* into event from public.listory_open_houses h
    join public.listory_properties p on p.slug=h.listing_slug and p.owner_id=h.owner_id
    where h.id=p_event_id and h.state='open' and p.status='published' for update of h,p;
  if not found then raise exception 'This Open House is not accepting sign-ins.' using errcode='P0002'; end if;
  -- Idempotent retry: one attendance per email/event, same generic public result.
  if exists(select 1 from public.listory_open_house_attendees where open_house_id=event.id and email=lower(btrim(p_email))) then return; end if;
  if (select count(*) from public.listory_open_house_attendees where open_house_id=event.id)>=2000
     or (select count(*) from public.listory_open_house_attendees where open_house_id=event.id and submission_fingerprint=p_fingerprint and created_at>now()-interval '10 minutes')>=30 then
    raise exception 'Please wait before submitting another sign-in.' using errcode='P0001';
  end if;
  insert into public.listory_open_house_attendees(
    open_house_id,listing_slug,owner_id,first_name,last_name,email,phone,working_with_realtor,buyer_status,notes,submission_fingerprint
  ) values(event.id,event.listing_slug,event.owner_id,btrim(p_first_name),btrim(p_last_name),lower(btrim(p_email)),btrim(p_phone),p_working_with_realtor,p_buyer_status,coalesce(p_notes,''),p_fingerprint);
end $$;
revoke all on function public.listory_submit_open_house(uuid,text,text,text,text,boolean,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.listory_submit_open_house(uuid,text,text,text,text,boolean,text,text,boolean,text) to service_role;
commit;
