import {test,expect} from '@playwright/test';
import {provisionAgent} from './helpers/agent';
const origin='http://127.0.0.1:3100';
test('private routes reject guests and legacy management headers; public listings remain readable',async({page,request})=>{
 await page.goto('/workspace#brand-profile');await expect(page).toHaveURL(/\/sign-in/);
 for(const path of ['/api/properties','/api/agent-profile','/api/properties/an-unknown-property'])expect((await request.get(path,{headers:{'x-listory-management':'a'.repeat(64)}})).status()).toBe(401);
 expect((await request.post('/api/properties',{headers:{Origin:origin},data:{address:'not created'}})).status()).toBe(401);
 expect((await request.post('/api/auth/sign-in',{headers:{Origin:'https://other.example'},data:{email:'a@example.com',password:'no'}})).status()).toBe(403);
 const rows=await fetch(process.env.SUPABASE_URL+'/rest/v1/listory_properties?status=eq.published&select=slug&limit=1',{headers:{apikey:process.env.SUPABASE_SECRET_KEY!}}).then(r=>r.json());
 expect(rows.length).toBe(1);await page.goto('/property/'+rows[0].slug);expect(page.url()).toContain('/property/');await expect(page.locator('input[name=password]')).toHaveCount(0);expect(await page.title()).not.toBe('404: This page could not be found.');
});
test('real Supabase password session survives refresh, stays HttpOnly and signs out',async({page})=>{
 const agent=await provisionAgent();
 try{
  await page.goto('/sign-in');await page.getByLabel('Email',{exact:true}).fill(agent.email);await page.getByLabel('Password',{exact:true}).fill(agent.password);await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await expect(page.getByRole('heading',{name:/Listings/})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:/Listings/})).toBeVisible();
  const cookies=(await page.context().cookies()).filter(c=>c.name.startsWith('listory-auth'));expect(cookies.length).toBeGreaterThan(0);for(const cookie of cookies){expect(cookie.httpOnly).toBe(true);expect(cookie.sameSite).toBe('Lax');}
  expect(await page.evaluate(()=>document.cookie)).not.toContain('listory-auth');expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('auth-token')))).toBe(false);
  await page.screenshot({path:'test-results/accounts-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.goto('/workspace#brand-profile');await expect(page.getByLabel('First name',{exact:true})).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/accounts-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('button',{name:'Sign Out',exact:true}).click();await expect(page).toHaveURL(/sign-in/);await page.goto('/workspace');await expect(page).toHaveURL(/sign-in/);
 }finally{await agent.cleanup();}
});
test('recovery changes the real password and rejects reused email proofs',async({page})=>{
 const agent=await provisionAgent();
 try{
  const response=await fetch(process.env.SUPABASE_URL+'/auth/v1/admin/generate_link',{method:'POST',headers:{apikey:process.env.SUPABASE_SECRET_KEY!,'Content-Type':'application/json'},body:JSON.stringify({type:'recovery',email:agent.email})});
  expect(response.ok).toBe(true);const proof=await response.json();expect(proof.hashed_token).toBeTruthy();
  await page.goto('/auth/callback?type=recovery&token_hash='+proof.hashed_token+'&next=/reset-password');
  expect(new URL(page.url()).host).toBe('127.0.0.1:3100');await expect(page.getByRole('heading',{name:'A fresh start.'})).toBeVisible();
  const newPassword=agent.password+'Updated';await page.locator('input[name=password]').fill(newPassword);await page.getByLabel('Confirm new password',{exact:true}).fill(newPassword);await page.getByRole('button',{name:'Save New Password'}).click();await expect(page.getByRole('heading',{name:/Listings/})).toBeVisible();
  expect((await page.request.post('/api/auth/sign-out',{headers:{origin},data:{}})).status()).toBe(200);
  expect((await page.request.post('/api/auth/sign-in',{headers:{origin},data:{email:agent.email,password:agent.password}})).ok()).toBe(false);
  expect((await page.request.post('/api/auth/sign-in',{headers:{origin},data:{email:agent.email,password:newPassword}})).status()).toBe(200);
  await page.request.post('/api/auth/sign-out',{headers:{origin},data:{}});
  await page.goto('/auth/callback?type=recovery&token_hash='+proof.hashed_token+'&next=//other.example');await expect(page).toHaveURL(/\/sign-in\?error=link/);
 }finally{await agent.cleanup();}
});

test('a new unconfirmed account is blocked until its single-use signup email proof is verified',async({page})=>{
 const agent=await provisionAgent(false);
 try{
  expect((await page.request.post('/api/auth/sign-in',{headers:{origin},data:{email:agent.email,password:agent.password}})).status()).toBe(401);
  const response=await fetch(process.env.SUPABASE_URL+'/auth/v1/admin/generate_link',{method:'POST',headers:{apikey:process.env.SUPABASE_SECRET_KEY!,'Content-Type':'application/json'},body:JSON.stringify({type:'signup',email:agent.email,password:agent.password})});
  expect(response.ok).toBe(true);const proof=await response.json();expect(proof.hashed_token).toBeTruthy();
  await page.goto('/auth/callback?type=signup&token_hash='+proof.hashed_token);
  await expect(page.getByRole('heading',{name:/Listings/})).toBeVisible();
  await page.request.post('/api/auth/sign-out',{headers:{origin},data:{}});
  expect((await page.request.post('/api/auth/sign-in',{headers:{origin},data:{email:agent.email,password:agent.password}})).status()).toBe(200);
 }finally{await agent.cleanup();}
});
test('live database RLS and server routes isolate two accounts and explicitly claim only proven legacy rows',async({page,browser})=>{
 test.skip(process.env.LISTORY_LIVE_STORAGE_TEST!=='1','Requires the installed migration and explicit live-storage opt-in.');
 const {randomUUID,createHash}=await import('node:crypto');
 const {emptyListing,sampleBrand}=await import('../app/lib/listing');
 const a=await provisionAgent(),b=await provisionAgent(),other=await browser.newContext();
 const slug='listory-auth-verification-'+randomUUID(),token='a'.repeat(64),legacySlug=slug+'-legacy';
 const base=process.env.SUPABASE_URL!,key=process.env.SUPABASE_SECRET_KEY!;
 const admin=(path:string,init:RequestInit={})=>fetch(base+path,{...init,headers:{...init.headers,apikey:key},signal:AbortSignal.timeout(15_000)});
 try{
  for(const [context,agent]of [[page.context(),a],[other,b]]as const)expect((await context.request.post('/api/auth/sign-in',{headers:{origin},data:{email:agent.email,password:agent.password}})).status()).toBe(200);
  const created=await page.request.post('/api/properties',{headers:{origin},data:{address:slug,owner_id:b.id}});expect(created.status()).toBe(201);const owned=await created.json();expect(owned.token).toBeUndefined();
  const saved=await admin(`/rest/v1/listory_properties?slug=eq.${owned.slug}&select=owner_id`);expect((await saved.json())[0].owner_id).toBe(a.id);
  expect((await other.request.get(`/api/properties/${owned.slug}`)).status()).toBe(404);
  expect((await other.request.get(`/api/properties/${owned.slug}/assets?file=a.jpg`)).status()).toBe(404);
  const profile={...sampleBrand,firstName:'Private A'};
  expect((await page.request.put('/api/agent-profile',{headers:{origin},data:{id:b.id,brand:profile}})).status()).toBe(200);
  expect((await (await other.request.get('/api/agent-profile')).json()).brand).toEqual({});
  const directA=await admin('/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:a.email,password:a.password})});
  expect(directA.ok).toBe(true);const jwtA=(await directA.json()).access_token;
  const directB=await admin('/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:b.email,password:b.password})});
  expect(directB.ok).toBe(true);const jwtB=(await directB.json()).access_token;
  const db=(jwt:string,path:string,init:RequestInit={})=>admin('/rest/v1/'+path,{...init,headers:{...init.headers,Authorization:'Bearer '+jwt}});
  expect((await db(jwtA,'listory_properties?select=management_hash')).status).toBe(403);
  expect((await (await db(jwtB,'listory_properties?select=slug')).json())).toEqual([]);
  const forged=await db(jwtB,'listory_properties',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:slug+'-forged',listing:{},brand:{},owner_id:a.id})});expect(forged.status).toBe(403);
  expect((await db(jwtB,`listory_properties?slug=eq.${owned.slug}&select=slug`,{method:'DELETE',headers:{Prefer:'return=minimal'}})).status).toBe(204);
  expect((await page.request.get(`/api/properties/${owned.slug}`)).status()).toBe(200);
  expect(await (await db(jwtB,'listory_agent_profiles?select=id,brand&id=eq.'+a.id)).json()).toEqual([]);
  const seeded=await admin('/rest/v1/listory_properties',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:legacySlug,status:'draft',listing:{...emptyListing,address:'Isolated legacy verification'},brand:sampleBrand,sample:true,management_hash:createHash('sha256').update(token).digest('hex')})});const seedError=seeded.ok?{}:await seeded.json();expect(seeded.ok,JSON.stringify({code:seedError.code,message:seedError.message})).toBe(true);
  expect((await page.request.post(`/api/properties/${legacySlug}/claim`,{headers:{origin},data:{token:'b'.repeat(64)}})).status()).toBe(403);
  expect((await page.request.post(`/api/properties/${legacySlug}/claim`,{headers:{origin},data:{token}})).status()).toBe(200);
  expect((await other.request.post(`/api/properties/${legacySlug}/claim`,{headers:{origin},data:{token}})).status()).toBe(403);
  const claimed=await (await admin(`/rest/v1/listory_properties?slug=eq.${legacySlug}&select=slug,listing,owner_id,management_hash`)).json();expect(claimed[0].owner_id).toBe(a.id);expect(claimed[0].management_hash).toBeNull();expect(claimed[0].listing.address).toBe('Isolated legacy verification');
 }finally{
  await admin('/rest/v1/listory_properties?slug=eq.'+legacySlug,{method:'DELETE'});await other.close();await a.cleanup();await b.cleanup();
 }
});
