-- Run once in Supabase > SQL Editor. Safe to run again.
begin;
create table if not exists public.listory_properties (
  slug text primary key,
  status text not null default 'published' check (status in ('draft', 'published')),
  listing jsonb not null,
  brand jsonb not null,
  sample boolean not null default false,
  management_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.listory_properties enable row level security;
revoke all on public.listory_properties from anon, authenticated;
grant select, insert, update, delete on public.listory_properties to service_role;
-- Only explicitly published photos/logos go here. No browser upload policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listory-published', 'listory-published', true, 20000000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
commit;
