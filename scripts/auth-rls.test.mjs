import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
const migration = await readFile('supabase/migrations/202610170001_agent_accounts.sql','utf8');
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const token='a'.repeat(64), hash=createHash('sha256').update(token).digest('hex');
async function setup(){
  const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema public,auth to anon,authenticated,service_role;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  insert into auth.users values('${a}'),('${b}');`);
  await db.exec(await readFile('supabase/setup.sql','utf8'));
  await db.query(`insert into public.listory_properties(slug,listing,brand,sample,management_hash) values('legacy-kept',$1,$2,false,$3)`,[JSON.stringify({address:'Legacy Home',photos:[{url:'https://example.test/photo.jpg',focalX:.7,focalY:.4}]}),JSON.stringify({firstName:'Original Realtor'}),hash]);
  await db.exec(migration);return db;
}
async function as(db,id,fn){await db.exec(`set role ${id?'authenticated':'anon'}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);try{return await fn()}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}}
const denied=fn=>assert.rejects(fn,e=>e.code==='42501');
test('migration is repeatable and preserves every legacy property, photo, focal point, brand and slug',async()=>{
 const db=await setup();try{const before=(await db.query('select * from listory_properties')).rows;assert.equal(before[0].owner_id,null);await db.exec(migration);assert.deepEqual((await db.query('select * from listory_properties')).rows,before);}finally{await db.close()}
});
test('database ownership rejects anonymous access, forged owners and cross-account listing/profile writes',async()=>{
 const db=await setup();try{
  await as(db,null,()=>denied(()=>db.query('select listing from listory_properties')));
  await as(db,a,()=>db.query(`insert into listory_properties(slug,status,listing,brand,sample,owner_id)values('owned-a','published','{}','{}',false,$1)`,[a]));
  await as(db,a,async()=>{assert.equal((await db.query('select slug from listory_properties')).rows.length,1);await denied(()=>db.query('select management_hash from listory_properties'));await denied(()=>db.query('update listory_properties set owner_id=$1 where slug=$2',[b,'owned-a']));await denied(()=>db.query(`insert into listory_properties(slug,listing,brand,sample,owner_id)values('forged','{}','{}',false,$1)`,[b]));});
  await as(db,b,async()=>{assert.equal((await db.query('select slug from listory_properties')).rows.length,0);assert.equal((await db.query("update listory_properties set status='draft' where slug='owned-a' returning slug")).rows.length,0);assert.equal((await db.query("delete from listory_properties where slug='owned-a' returning slug")).rows.length,0);});
  await as(db,a,()=>db.query('insert into listory_agent_profiles(id,brand)values($1,$2)',[a,{firstName:'Private Agent A'}]));
  await as(db,b,async()=>{assert.equal((await db.query('select * from listory_agent_profiles')).rows.length,0);await denied(()=>db.query('insert into listory_agent_profiles(id)values($1)',[a]));assert.equal((await db.query("update listory_agent_profiles set brand='{}' where id=$1 returning id",[a])).rows.length,0);});
  await as(db,null,()=>denied(()=>db.query('select * from listory_agent_profiles')));
 }finally{await db.close()}
});
test('legacy claims require a verified user and the matching key, invalidate the key and never reassign another owner',async()=>{
 const db=await setup();try{
  const before=(await db.query("select slug,listing,brand,status from listory_properties where slug='legacy-kept'")).rows;
  await as(db,null,()=>denied(()=>db.query('select listory_claim_legacy_property($1,$2)',['legacy-kept',token])));
  await as(db,a,()=>denied(()=>db.query('select listory_claim_legacy_property($1,$2)',['legacy-kept','b'.repeat(64)])));
  await as(db,a,()=>db.query('select listory_claim_legacy_property($1,$2)',['legacy-kept',token]));
  assert.deepEqual((await db.query("select slug,listing,brand,status from listory_properties where slug='legacy-kept'")).rows,before);
  const row=(await db.query("select owner_id,management_hash from listory_properties where slug='legacy-kept'")).rows[0];assert.equal(row.owner_id,a);assert.equal(row.management_hash,null);
  await as(db,b,()=>denied(()=>db.query('select listory_claim_legacy_property($1,$2)',['legacy-kept',token])));
  await as(db,a,()=>db.query('select listory_claim_legacy_property($1,$2)',['legacy-kept',token]));
 }finally{await db.close()}
});
