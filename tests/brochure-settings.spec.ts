import {test,expect} from '@playwright/test';
import {provisionAgent} from './helpers/agent';
const origin='http://127.0.0.1:3100';
test('brochure choices persist privately without publishing drafts, changing listing content or resetting lifecycle',async({page,browser,request})=>{
 const owner=await provisionAgent(),other=await provisionAgent(),second=await browser.newContext();
 try{
  expect((await page.request.post('/api/auth/sign-in',{headers:{origin},data:{email:owner.email,password:owner.password}})).ok()).toBe(true);
  expect((await second.request.post('/api/auth/sign-in',{headers:{origin},data:{email:other.email,password:other.password}})).ok()).toBe(true);
  const created=await page.request.post('/api/properties',{headers:{origin},data:{address:'Private studio settings verification'}});expect(created.status()).toBe(201);const {slug}=await created.json();
  const path=`/api/properties/${slug}/brochure-settings`,settings={design:'editorial',format:'double-sided',coverIndex:1,coverFocal:{focalX:.7,focalY:.4},captions:['Accurate supplied caption']};
  expect((await request.put(path,{headers:{origin},data:settings})).status()).toBe(401);
  expect((await second.request.put(path,{headers:{origin},data:settings})).status()).toBe(404);
  expect((await page.request.put(path,{headers:{origin:'https://other.example'},data:settings})).status()).toBe(403);
  const before=(await (await page.request.get('/api/properties')).json()).properties.find((r:{slug:string})=>r.slug===slug);
  expect((await page.request.put(path,{headers:{origin},data:settings})).status()).toBe(200);
  const row=(await (await page.request.get('/api/properties')).json()).properties.find((r:{slug:string})=>r.slug===slug);
  expect(row.listing.brochure).toEqual(settings);expect(row.status).toBe('draft');expect(row.first_published_at).toBe(before.first_published_at);expect(row.current_until).toBe(before.current_until);expect(row.owner_id).toBe(owner.id);
  const {brochure,...listing}=row.listing;expect(listing).toEqual(before.listing);expect(row.brand).toEqual(before.brand);
 }finally{await second.close();await other.cleanup();await owner.cleanup();}
});
