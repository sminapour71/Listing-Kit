import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {provisionAgent} from './helpers/agent';
import {sampleListing,sampleBrand} from '../app/lib/listing';
import {siteOrigin} from '../app/lib/site-url';
const origin='http://127.0.0.1:3100';
test('portfolio privacy, branding, public navigation, feature limits and safe cascading deletion',async({page,browser},info)=>{
 test.skip(process.env.LISTORY_LIVE_STORAGE_TEST!=='1','Requires isolated Supabase test accounts.');test.setTimeout(240000);
 const owner=await provisionAgent(),other=await provisionAgent(),guest=await browser.newContext(),second=await browser.newContext();
 const unique=randomUUID().slice(0,8),slug='avery-chen-'+unique,renamed=slug+'-homes',slugs:string[]=[];
 const base=process.env.SUPABASE_URL!,key=process.env.SUPABASE_SECRET_KEY!;
 const db=async(path:string,init:RequestInit={})=>fetch(base+'/rest/v1/'+path,{...init,headers:{apikey:key,...init.headers},signal:AbortSignal.timeout(20000)});
 const profile={...sampleBrand,firstName:'Avery',lastName:'Chen',email:'public-avery@example.test'};
 for(const k of ['headshot','personalLogo','brokerageLogo']as const)profile[k]=`data:image/jpeg;base64,${(await readFile('public/images/property-1.jpg')).toString('base64')}`;
 try{
  expect((await page.request.post('/api/auth/sign-in',{headers:{origin},data:{email:owner.email,password:owner.password}})).status()).toBe(200);
  expect((await second.request.post('/api/auth/sign-in',{headers:{origin},data:{email:other.email,password:other.password}})).status()).toBe(200);
  expect((await page.request.put('/api/agent-profile',{headers:{origin},data:{brand:profile}})).status()).toBe(200);
  await page.goto('/#brand-profile');const settings=page.getByRole('region',{name:'Your Agent Portfolio'});await expect(settings.getByLabel('Public portfolio address')).toHaveValue('avery-chen');
  await settings.getByLabel('Public portfolio address').fill(slug);await settings.getByLabel('Public biography').fill('A thoughtful approach to real estate.\n\nLocal knowledge, personal service.');
  for(const [i,area]of ['Kitsilano','Yaletown','North Vancouver','Downtown Vancouver','Brentwood'].entries())await settings.getByLabel(`Subarea ${i+1}`,{exact:true}).fill(area);
  await settings.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect(settings.getByText('Portfolio saved privately.',{exact:true})).toBeVisible();expect((await guest.request.get('/agent/'+slug)).status()).toBe(404);
  await settings.getByLabel('Show my portfolio publicly').check();await settings.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect(settings.getByText('Your public portfolio is ready.',{exact:true})).toBeVisible();
  expect((await second.request.put('/api/agent-portfolio',{headers:{origin},data:{portfolio_slug:slug,portfolio_bio:'forged',portfolio_subareas:[],portfolio_published:true,id:owner.id}})).status()).toBe(409);
  const otherSave=await second.request.put('/api/agent-portfolio',{headers:{origin},data:{portfolio_slug:'other-'+unique,portfolio_bio:'Other agent',portfolio_subareas:[],portfolio_published:true,id:owner.id}});expect(otherSave.status()).toBe(200);
  expect((await guest.request.put('/api/agent-portfolio',{headers:{origin},data:{}})).status()).toBe(401);
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);await settings.getByRole('button',{name:'Copy Portfolio Link'}).click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(siteOrigin()+'/agent/'+slug);await expect(settings.getByRole('link',{name:'View Portfolio',exact:true})).toHaveAttribute('href',siteOrigin()+'/agent/'+slug);
  // Branding upserts must preserve portfolio fields.
  expect((await page.request.put('/api/agent-profile',{headers:{origin},data:{brand:{...profile,title:'Personal Real Estate Corporation'}}})).status()).toBe(200);
  expect((await (await page.request.get('/api/agent-portfolio')).json()).portfolio.portfolio_slug).toBe(slug);
  const summaries=[];
  for(let i=0;i<8;i++){
   const address=`Portfolio Test ${unique} Home ${i}, Vancouver, BC`;
   const create=await page.request.post('/api/properties',{headers:{origin},data:{address,sample:true}});expect(create.status()).toBe(201);const p=await create.json();slugs.push(p.slug);summaries.push({slug:p.slug,address});
   if(i===7)continue;
   let photos=[];if(i===0){const upload=await page.request.post(`/api/properties/${p.slug}/assets`,{headers:{origin,'Content-Type':'image/jpeg'},data:await readFile('public/images/property-1.jpg')});expect(upload.ok()).toBe(true);const image=await upload.json();photos=[{id:'cover',name:'Cover',...image,focalX:.7,focalY:.4}];}
   expect((await page.request.put(`/api/properties/${p.slug}`,{headers:{origin},data:{listing:{...sampleListing,address,photos,floorPlan:null},brand:{...sampleBrand,firstName:'Avery',lastName:'Chen'}}})).status()).toBe(200);
  }
  expect((await second.request.patch(`/api/properties/${slugs[0]}/featured`,{headers:{origin},data:{featured:true}})).status()).toBe(404);
  expect((await page.request.patch(`/api/properties/${slugs[7]}/featured`,{headers:{origin},data:{featured:true}})).status()).toBe(400);
  await page.reload();await expect(settings.locator('.portfolio-feature-choice')).toHaveCount(8);
  await settings.locator('.portfolio-feature-choice').filter({hasText:summaries[0].address}).getByRole('checkbox').check();await expect(settings.getByText('Featured listings updated.',{exact:true})).toBeVisible();
  for(let i=1;i<6;i++)expect((await page.request.patch(`/api/properties/${slugs[i]}/featured`,{headers:{origin},data:{featured:true}})).status()).toBe(200);
  expect((await page.request.patch(`/api/properties/${slugs[6]}/featured`,{headers:{origin},data:{featured:true}})).status()).toBe(400);
  expect((await page.request.patch(`/api/properties/${slugs[1]}/featured`,{headers:{origin},data:{featured:false}})).status()).toBe(200);
  const publicPage=await guest.newPage();await guest.route('https://*.supabase.co/**',async route=>{const r=await fetch(route.request().url());await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});});
  const response=await publicPage.goto('/agent/'+slug);expect(response?.status()).toBe(200);const html=await response!.text();for(const privateText of [owner.id,other.id,owner.email,other.email,'owner_id','management_hash','submission_fingerprint',summaries[7].address])expect(html).not.toContain(privateText);
  await expect(publicPage.getByRole('heading',{name:'Avery Chen',exact:true,level:1})).toBeVisible();await expect(publicPage.getByRole('heading',{name:'Featured Listings',exact:true})).toBeVisible();await expect(publicPage.locator('.agent-property-card')).toHaveCount(12);await expect(publicPage.getByText('Personal Real Estate Corporation',{exact:true}).first()).toBeVisible();
  for(const image of await publicPage.locator('.agent-portrait img,.agent-team-logo,.agent-brokerage-logo').all()){await expect(image).toBeVisible();expect(await image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);}
  for(const width of [320,390,834,1440]){await publicPage.setViewportSize({width,height:1000});expect(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await publicPage.screenshot({path:info.outputPath(`portfolio-${width}.png`),fullPage:true});}
  await expect(publicPage.locator('.agent-property-card').filter({hasText:summaries[0].address}).first()).toHaveAttribute('href',siteOrigin()+'/property/'+slugs[0]);
  const prop=await guest.request.get('/property/'+slugs[0]);expect(prop.status()).toBe(200);expect(await prop.text()).toContain(siteOrigin()+'/agent/'+slug);
  // Stable aliases redirect after editing, and previous slug cannot be stolen.
  await settings.getByLabel('Public portfolio address').fill(renamed);await settings.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect(settings.getByText('Your public portfolio is ready.',{exact:true})).toBeVisible();
  await publicPage.goto('/agent/'+slug);await expect(publicPage).toHaveURL(new RegExp('/agent/'+renamed+'$'));
  expect((await second.request.put('/api/agent-portfolio',{headers:{origin},data:{portfolio_slug:slug,portfolio_bio:'taken',portfolio_subareas:[],portfolio_published:true}})).status()).toBe(409);
  const event=await page.request.post(`/api/properties/${slugs[0]}/open-houses`,{headers:{origin},data:{date:'2026-11-23',startTime:'13:00',endTime:'15:00',timezone:'America/Vancouver',notes:'PRIVATE EVENT NOTE'}});expect(event.status()).toBe(201);const eventData=await event.json();const id=eventData.id;
  const submit=await guest.request.post(`/api/open-house-sign-in/${id}`,{headers:{origin},data:{firstName:'Test',lastName:'Visitor',email:'visitor@example.test',phone:'6045550100',workingWithRealtor:'no',buyerStatus:'interested',notes:'PRIVATE VISITOR NOTE',consent:true,website:''}});expect(submit.status()).toBe(200);
  expect((await second.request.post(`/api/properties/${slugs[0]}/delete`,{headers:{origin},data:{confirmation:'DELETE',updated_at:new Date().toISOString()}})).status()).toBe(404);
  expect((await guest.request.get(`/api/properties/${slugs[0]}/delete`)).status()).toBe(401);
  const summary=await (await page.request.get(`/api/properties/${slugs[0]}/delete`)).json();expect(summary.openHouses).toBe(1);expect(summary.attendees).toBe(1);
  expect((await page.request.post(`/api/properties/${slugs[0]}/delete`,{headers:{origin},data:{confirmation:'delete',updated_at:summary.updated_at}})).status()).toBe(400);
  expect((await page.request.post(`/api/properties/${slugs[0]}/delete`,{headers:{origin},data:{confirmation:'DELETE',updated_at:'2000-01-01T00:00:00Z'}})).status()).toBe(409);
  if(info.project.name==='mobile')await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('button',{name:'Listings',exact:false}).first().click();await page.locator('.listing-card').filter({hasText:summaries[0].address}).getByRole('button',{name:'Edit Listing',exact:true}).click();
  await page.locator('.listing-danger').getByRole('button',{name:'Delete Listing',exact:true}).click();const modal=page.getByRole('dialog',{name:'Delete this listing?'});await expect(modal.getByText('1 attendee record',{exact:false})).toBeVisible();await expect(modal.getByRole('button',{name:'Delete Listing',exact:true})).toBeDisabled();await modal.getByLabel('Type DELETE to confirm').fill('delete');await expect(modal.getByRole('button',{name:'Delete Listing',exact:true})).toBeDisabled();await modal.getByRole('button',{name:'Keep Listing'}).click();expect((await guest.request.get('/property/'+slugs[0])).status()).toBe(200);
  await page.locator('.listing-danger').getByRole('button',{name:'Delete Listing',exact:true}).click();await modal.getByLabel('Type DELETE to confirm').fill('DELETE');await expect(modal.getByRole('button',{name:'Delete Listing',exact:true})).toBeEnabled();await modal.screenshot({path:info.outputPath('delete-confirmation.png')});const deleting=page.waitForResponse(r=>r.url().endsWith(`/api/properties/${slugs[0]}/delete`)&&r.request().method()==='POST');await modal.getByRole('button',{name:'Delete Listing',exact:true}).click();const deleted=await deleting;expect(deleted.status()).toBe(200);expect(await deleted.json()).toEqual({deleted:true});await expect(modal).not.toBeVisible();await expect(page.getByRole('heading',{name:'Listings',exact:false,level:1})).toBeVisible();
  for(const table of ['listory_properties','listory_open_houses','listory_open_house_attendees'])expect(await (await db(table==='listory_properties'?`${table}?slug=eq.${slugs[0]}&select=slug`:`${table}?listing_slug=eq.${slugs[0]}&select=id`)).json()).toEqual([]);
  const deletedPage=await guest.request.get('/property/'+slugs[0]);expect(deletedPage.status()).toBe(404);expect(await deletedPage.text()).toContain('no longer available');const deletedEvent=await guest.request.get('/open-house/'+id);expect(await deletedEvent.text()).toContain('Sign-in is unavailable.');expect((await guest.request.post(`/api/open-house-sign-in/${id}`,{headers:{origin},data:{firstName:'Test',lastName:'Visitor',email:'again@example.test',phone:'6045550100',workingWithRealtor:'no',buyerStatus:'interested',consent:true,website:''}})).status()).toBe(404);expect((await guest.request.get('/property/'+slugs[1])).status()).toBe(200);
  const duplicate=await page.request.post('/api/properties',{headers:{origin},data:{address:summaries[0].address,sample:true}});expect(duplicate.status()).toBe(201);const newProperty=await duplicate.json();slugs.push(newProperty.slug);expect(newProperty.slug).not.toBe(slugs[0]);
  await publicPage.reload();await expect(publicPage.locator('.agent-property-card').filter({hasText:summaries[0].address})).toHaveCount(0);for(const leaked of ['PRIVATE EVENT NOTE','PRIVATE VISITOR NOTE','visitor@example.test',owner.id])expect(await publicPage.content()).not.toContain(leaked);
  for(let i=2;i<6;i++)expect((await page.request.patch(`/api/properties/${slugs[i]}/featured`,{headers:{origin},data:{featured:false}})).status()).toBe(200);
  await publicPage.reload();await expect(publicPage.getByRole('heading',{name:'Featured Listings',exact:true})).toHaveCount(0);
  const latest=(await (await page.request.get('/api/agent-portfolio')).json()).portfolio;expect((await page.request.put('/api/agent-portfolio',{headers:{origin},data:{...latest,portfolio_bio:'A'.repeat(4000),portfolio_subareas:['Neighbourhood'.repeat(6)]}})).status()).toBe(200);await publicPage.setViewportSize({width:320,height:900});await publicPage.reload();expect(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/#brand-profile');await expect(settings.getByLabel('Show my portfolio publicly')).toBeChecked();await settings.getByLabel('Show my portfolio publicly').uncheck();await settings.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect(settings.getByText('Portfolio saved privately.',{exact:true})).toBeVisible();expect((await guest.request.get('/agent/'+renamed)).status()).toBe(404);expect((await guest.request.get(`/agent/${renamed}/assets/headshot`)).status()).toBe(404);
 }finally{
  await guest.close();await second.close();
  // Only test-owned known paths, including the intentionally deleted row.
  for(const slug of slugs){const r=await fetch(base+'/storage/v1/object/list/listory-published',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({prefix:slug+'/',limit:1000})});if(r.ok){const files=await r.json();if(files.length)await fetch(base+'/storage/v1/object/listory-published',{method:'DELETE',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({prefixes:files.map((f:{name:string})=>slug+'/'+f.name)})});}}
  await owner.cleanup();await other.cleanup();for(const slug of slugs)await db(`listory_deleted_property_slugs?slug=eq.${slug}`,{method:'DELETE'});
 }
});
