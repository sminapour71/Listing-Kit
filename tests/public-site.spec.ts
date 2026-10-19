import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {provisionAgent} from './helpers/agent';
import {sampleBrand,sampleListing} from '../app/lib/listing';
import {discoveryToday} from '../app/lib/public-discovery';
const origin='http://127.0.0.1:3100';
test('public routes, responsive navigation, clickable logo and protected workspace',async({page},info)=>{
 for(const [route,title] of [['/','Every listing'],['/buy','Homes on Listory'],['/agents','Agents on Listory'],['/fresh','Fresh Listings'],['/open-houses','Open Houses Today'],['/guides','Perspective for'],['/neighbourhoods','Find your sense'],['/for-agents','Give your listings']]){
  const response=await page.goto(route);expect(response?.status()).toBe(200);await expect(page.locator('h1')).toContainText(title);
  await expect(page.locator('.public-logo')).toHaveAttribute('href','/');await expect(page.locator('.public-account-link')).toHaveAttribute('href','/sign-in');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const html=await response!.text();for(const field of ['owner_id','management_hash','submission_fingerprint','SUPABASE_SECRET_KEY'])expect(html).not.toContain(field);
 }
 await page.goto('/');
 for(const width of [320,390,834,1440]){
  await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(width<1180){const menu=page.getByRole('button',{name:'Open navigation'});await menu.click();await expect(page.getByRole('navigation',{name:'Public navigation'})).toBeVisible();await expect(page.getByRole('navigation',{name:'Public navigation'}).getByRole('link',{name:'Neighbourhoods',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(menu).toHaveAttribute('aria-expanded','false');}
 }
 for(const image of await page.locator('.public-agent-photo img').all()){await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);}
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath('public-home.png'),fullPage:true});
 await page.goto('/guides');await page.locator('.public-logo').click();await expect(page).toHaveURL(origin+'/');
 await page.locator('.public-menu-toggle').evaluate((el:HTMLButtonElement)=>{if(getComputedStyle(el).display!=='none')el.click();});await page.locator('.public-account-link').click();await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
 await page.locator('.account-wordmark').click();await expect(page).toHaveURL(origin+'/');
 await page.getByLabel('Where does your next chapter begin?').fill('Vancouver');await page.getByRole('button',{name:'Explore homes',exact:true}).click();await expect(page).toHaveURL(/\/buy\?location=Vancouver/);
 await page.goto('/workspace');await expect(page).toHaveURL(/\/sign-in\?next=/);
 await page.goto('/#brand-profile');await expect(page).toHaveURL(/\/sign-in/);
 await page.goto('/');await page.evaluate(()=>{location.hash='listory-agents';});await expect(page).toHaveURL(/\/sign-in/);
 for(const path of ['/api/properties','/api/agents','/api/agent-profile'])expect((await page.request.get(path)).status()).toBe(401);
});
test('real public cards, active agent search, today events, attendee privacy and authenticated navigation',async({page,browser},info)=>{
 test.skip(process.env.LISTORY_LIVE_STORAGE_TEST!=='1','Opt in to uniquely owned, cleaned-up Supabase test records.');test.setTimeout(240_000);
 const agent=await provisionAgent(),guest=await browser.newContext({viewport:{width:info.project.name==='mobile'?390:1440,height:1000},isMobile:info.project.name==='mobile',hasTouch:info.project.name==='mobile'}),suffix=randomUUID().slice(0,8),portfolio='public-test-'+suffix,addresses:string[]=[],slugs:string[]=[];
 const publicName='Public Check '+suffix,privateNote='PRIVATE EVENT '+suffix,privateVisitor='PRIVATE VISITOR '+suffix;
 try{
  expect((await page.request.post('/api/auth/sign-in',{headers:{origin},data:{email:agent.email,password:agent.password}})).status()).toBe(200);
  const image=(await readFile('public/images/property-1.jpg')).toString('base64');const brand={...sampleBrand,firstName:'Public',lastName:'Check '+suffix,teamName:'Harbour '+suffix,brokerageName:'Public Brokerage',headshot:'data:image/jpeg;base64,'+image};
  expect((await page.request.put('/api/agent-profile',{headers:{origin},data:{brand}})).status()).toBe(200);
  expect((await page.request.put('/api/agent-portfolio',{headers:{origin},data:{portfolio_slug:portfolio,portfolio_bio:'A test portfolio.',portfolio_subareas:['Public Test Neighbourhood '+suffix],portfolio_published:true}})).status()).toBe(200);
  for(let i=0;i<4;i++){
   const address=`Public Discovery ${suffix} Home ${i}, Vancouver, BC`;addresses.push(address);
   const created=await page.request.post('/api/properties',{headers:{origin},data:{address,sample:true}});expect(created.status()).toBe(201);const {slug}=await created.json();slugs.push(slug);
   const upload=await page.request.post(`/api/properties/${slug}/assets`,{headers:{origin,'Content-Type':'image/jpeg'},data:await readFile('public/images/property-1.jpg')});expect(upload.ok()).toBe(true);const asset=await upload.json();
   expect((await page.request.put(`/api/properties/${slug}`,{headers:{origin},data:{listing:{...sampleListing,address,photos:[{id:'cover',name:'Test cover',...asset,focalX:.6,focalY:.4}],floorPlan:null},brand:{...sampleBrand,firstName:'Public',lastName:'Check '+suffix}}})).status()).toBe(200);
  }
  const draftAddress='PRIVATE DRAFT '+suffix;expect((await page.request.post('/api/properties',{headers:{origin},data:{address:draftAddress}})).status()).toBe(201);
  const ev=await page.request.post(`/api/properties/${slugs[0]}/open-houses`,{headers:{origin},data:{date:discoveryToday(),startTime:'13:00',endTime:'15:00',notes:privateNote}});expect(ev.status()).toBe(201);const {id}=await ev.json();
  expect((await guest.request.post(`/api/open-house-sign-in/${id}`,{headers:{origin},data:{firstName:privateVisitor,lastName:'Visitor',email:`visitor-${suffix}@example.test`,phone:'6045550198',workingWithRealtor:'no',buyerStatus:'browsing',notes:'Private attendee note',consent:true,website:''}})).status()).toBe(200);
  await guest.route('https://*.supabase.co/**',async route=>{const r=await fetch(route.request().url());await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});});
  const publicPage=await guest.newPage();
  for(const route of ['/','/fresh','/buy','/agents?q='+encodeURIComponent(suffix),'/open-houses']){
   const r=await publicPage.goto(route);expect(r?.status()).toBe(200);expect(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const html=await r!.text();for(const secret of [agent.id,agent.email,privateNote,privateVisitor,draftAddress,'submission_fingerprint','owner_id'])expect(html).not.toContain(secret);
   if(['/','/fresh','/buy'].includes(route)){const cards=publicPage.locator('.public-home-card,.agent-property-card').filter({hasText:addresses[0]});await expect(cards.first()).toBeVisible();}
   if(route.startsWith('/agents')){await expect(publicPage.locator('.public-agent-card').filter({hasText:publicName})).toBeVisible();}
  }
  const eventCard=publicPage.locator('.public-home-card').filter({hasText:addresses[0]});await expect(eventCard).toContainText('1:00 PM');await eventCard.getByRole('link').click();await expect(publicPage).toHaveURL(origin+'/property/'+slugs[0]);await publicPage.locator('.public-logo').click();await expect(publicPage).toHaveURL(origin+'/');
  await publicPage.locator('.public-home-card').filter({hasText:addresses[0]}).first().getByRole('link').first().click();await expect(publicPage).toHaveURL(origin+'/property/'+slugs[0]);await publicPage.locator('.public-logo').click();
  const row=publicPage.locator('.public-scroll-row[aria-label="Fresh Listings"]');const before=await row.evaluate(el=>el.scrollLeft);await publicPage.getByRole('button',{name:'Next Fresh Listings',exact:true}).click();await expect.poll(()=>row.evaluate(el=>el.scrollLeft)).toBeGreaterThan(before);
  await row.evaluate(el=>el.scrollTo({left:0,behavior:'instant'}));await row.scrollIntoViewIfNeeded();
  if(info.project.name==='mobile'){const box=(await row.boundingBox())!,cdp=await guest.newCDPSession(publicPage),y=box.y+box.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.8,y}]});for(const n of [.65,.5,.35,.2])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*n,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(()=>row.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await cdp.detach();}else{await row.hover();await publicPage.mouse.wheel(400,0);await expect.poll(()=>row.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);}

  await publicPage.goto('/agents?q='+suffix);await publicPage.locator('.public-agent-card').filter({hasText:publicName}).click();await expect(publicPage).toHaveURL(origin+'/agent/'+portfolio);await expect(publicPage.locator('h1')).toHaveText(publicName);
  await page.goto('/');await expect(page.locator('h1')).toContainText('Every listing');await expect(page.locator('.public-account-link')).toHaveAttribute('href','/workspace');if(info.project.name==='mobile')await page.getByRole('button',{name:'Open navigation'}).click();await page.locator('.public-account-link').click();await expect(page).toHaveURL(origin+'/workspace');await expect(page.getByRole('heading',{name:/^Listings/})).toBeVisible();
  await page.goto('/workspace#brand-profile');await expect(page.getByLabel('First name',{exact:true})).toHaveValue('Public');
  // Closing an event removes it from public discovery, preserving the property.
  expect((await page.request.patch('/api/open-houses/'+id,{headers:{origin},data:{state:'closed'}})).status()).toBe(200);
  await publicPage.goto('/open-houses');await expect(publicPage.locator('.public-home-card').filter({hasText:addresses[0]})).toHaveCount(0);
 }finally{await guest.close();await agent.cleanup();}
});
