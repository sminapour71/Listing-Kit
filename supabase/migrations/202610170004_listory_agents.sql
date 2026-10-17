-- Authenticated workspace directory. No profile/account data is changed.
-- Active means confirmed, not deleted and not currently banned in Supabase Auth.
begin;
create or replace function public.listory_directory_agents(p_search text default '',p_offset integer default 0,p_limit integer default 25)
returns table(portfolio_slug text,full_name text,team_name text,brokerage_name text,has_headshot boolean)
language plpgsql stable security definer set search_path=pg_catalog,public,auth as $$
begin
 if p_offset is null or p_offset<0 or p_offset>1000000 or p_limit is null or p_limit<1 or p_limit>25 or length(coalesce(p_search,''))>120 then raise exception 'Check directory search and page.' using errcode='22023'; end if;
 return query
 select p.portfolio_slug,btrim(concat_ws(' ',btrim(p.brand->>'firstName'),btrim(p.brand->>'lastName'))),coalesce(p.brand->>'teamName',''),coalesce(p.brand->>'brokerageName',''),coalesce(p.brand->>'headshot','')<>''
 from public.listory_agent_profiles p join auth.users u on u.id=p.id
 where p.portfolio_published and p.portfolio_slug is not null
 and p.portfolio_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
 and length(btrim(coalesce(p.brand->>'firstName','')))>0
 and length(btrim(coalesce(p.brand->>'lastName','')))>0
 and u.email_confirmed_at is not null and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=now()) and not coalesce(u.is_anonymous,false)
 and strpos(lower(concat_ws(' ',p.brand->>'firstName',p.brand->>'lastName',p.brand->>'teamName',p.brand->>'brokerageName',array_to_string(p.portfolio_subareas,' '))),lower(btrim(coalesce(p_search,''))))>0
 order by lower(btrim(concat_ws(' ',btrim(p.brand->>'firstName'),btrim(p.brand->>'lastName')))),p.portfolio_slug
 limit p_limit offset p_offset;
end;$$;
-- Only the authenticated Next.js endpoint may call this using server credentials.
-- Neither anonymous callers nor signed-in clients can read auth/profile tables
-- through this function. Existing owner-only table policies remain unchanged.
revoke all on function public.listory_directory_agents(text,integer,integer) from public,anon,authenticated;
grant execute on function public.listory_directory_agents(text,integer,integer) to service_role;
commit;
