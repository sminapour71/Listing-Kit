import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import jsQR from 'jsqr';
import {createCanvas} from '@napi-rs/canvas';
import {provisionAgent} from './helpers/agent';
import {sampleListing,sampleBrand} from '../app/lib/listing';
import {siteOrigin} from '../app/lib/site-url';
const origin='http://127.0.0.1:3100';
const visitorData={firstName:'Avery',lastName:'Visitor',email:'avery.visitor@example.test',phone:'604-555-0198',workingWithRealtor:'no',buyerStatus:'interested',notes:'PRIVATE ATTENDEE NOTE: moving in spring',consent:true,website:''};
test('Open House QR captures private attendees for the owner; public/second-agent access is denied and property/PDF QR stays separate',async({page,browser},info)=>{
 test.skip(process.env.LISTORY_LIVE_STORAGE_TEST!=='1','Explicitly opt in to isolated real Supabase test data.');test.setTimeout(180_000);
 const owner=await provisionAgent(),other=await provisionAgent(),guest=await browser.newContext({viewport:{width:info.project.name==='mobile'?390:1440,height:1000},isMobile:info.project.name==='mobile',hasTouch:info.project.name==='mobile'}),second=await browser.newContext();
 const address=`Listory Open House Verification ${randomUUID().slice(0,8)}, Vancouver, BC`;
 try{
  expect((await page.request.post('/api/auth/sign-in',{headers:{origin},data:{email:owner.email,password:owner.password}})).status()).toBe(200);
  expect((await second.request.post('/api/auth/sign-in',{headers:{origin},data:{email:other.email,password:other.password}})).status()).toBe(200);
  const created=await page.request.post('/api/properties',{headers:{origin},data:{address,sample:true}});expect(created.status()).toBe(201);const property=await created.json(),propertyUrl=`${siteOrigin()}/property/${property.slug}`;
  const upload=await page.request.post(`/api/properties/${property.slug}/assets`,{headers:{origin,'Content-Type':'image/jpeg'},data:await readFile('public/images/property-1.jpg')});expect(upload.ok()).toBe(true);const asset=await upload.json();
  const listing={...sampleListing,address,photos:[{id:'test-cover',name:'Test property photo',...asset,focalX:.7,focalY:.4}],floorPlan:null},brand={...sampleBrand,firstName:'Test',lastName:'Realtor',headshot:asset.url,personalLogo:asset.url,brokerageLogo:asset.url,primaryColour:'#152f48',secondaryColour:'#efd8b5'};
  expect((await page.request.put(`/api/properties/${property.slug}`,{headers:{origin},data:{listing,brand}})).status()).toBe(200);
  await page.goto('/');await page.locator('.listing-card').filter({hasText:address}).getByRole('button',{name:'Edit Listing',exact:true}).click();
  const management=page.getByRole('region',{name:'Open House',exact:true});await expect(management).toBeVisible();
  const form=page.getByRole('form',{name:'Create Open House'});await form.getByLabel('Date',{exact:true}).fill('2026-11-21');await form.getByLabel('Start time',{exact:true}).fill('13:00');await form.getByLabel('End time',{exact:true}).fill('15:00');await form.getByLabel('Optional notes').fill('PRIVATE EVENT NOTE: agent-only instructions');await form.getByRole('button',{name:'Create Open House',exact:true}).click();
  await expect(management.getByText('Open House created. Your sign-in link and QR are ready.')).toBeVisible();await expect(management.getByRole('heading',{name:'0 Attendees'})).toBeVisible();
  const eventUrl=(await management.locator('.oh-event-url').getAttribute('href'))!,id=new URL(eventUrl).pathname.split('/').pop()!,eventPath='/open-house/'+id;
  expect(eventUrl).toBe(`${siteOrigin()}${eventPath}`);expect(eventUrl).not.toBe(propertyUrl);
  const qr=management.getByAltText('Open House Sign-In QR',{exact:true});await expect(qr).toBeVisible();
  const rgba=await sharp(Buffer.from((await qr.getAttribute('src'))!.split(',')[1],'base64')).ensureAlpha().raw().toBuffer({resolveWithObject:true});expect(jsQR(new Uint8ClampedArray(rgba.data),rgba.info.width,rgba.info.height)?.data).toBe(eventUrl);
  await expect(management.getByRole('link',{name:'View Sign-In Page'})).toHaveAttribute('href',eventUrl);
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);await management.getByRole('button',{name:'Copy Sign-In Link'}).click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(eventUrl);
  await management.screenshot({path:info.outputPath('open-house-owner.png')});
  await guest.route('https://*.supabase.co/**',async route=>{const response=await fetch(route.request().url(),{signal:AbortSignal.timeout(15000)});await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});});
  const publicPage=await guest.newPage(),publicResponse=await publicPage.goto(eventPath);expect(publicResponse?.status()).toBe(200);const publicHtml=await publicResponse!.text();
  for(const privateText of [owner.id,owner.email,'PRIVATE EVENT NOTE','PRIVATE ATTENDEE NOTE','submission_fingerprint','management_hash'])expect(publicHtml).not.toContain(privateText);
  await expect(publicPage.getByRole('heading',{name:address,exact:true})).toBeVisible();await expect(publicPage.getByText('Test Realtor',{exact:true})).toBeVisible();await expect(publicPage.locator('.oh-property-hero img')).toBeVisible();
  await expect(publicPage.getByRole('checkbox',{name:'I agree to this contact disclosure.'})).not.toBeChecked();
  for(const path of [`/api/open-houses/${id}/attendees`,`/api/properties/${property.slug}/open-houses`])expect((await guest.request.get(path)).status()).toBe(401);
  expect((await guest.request.post(`/api/open-house-sign-in/${id}`,{headers:{origin},data:{...visitorData,consent:false}})).status()).toBe(400);
  expect((await guest.request.post(`/api/open-house-sign-in/${id}`,{headers:{origin:'https://other.example'},data:visitorData})).status()).toBe(403);
  for(const [label,value]of [['First Name','Avery'],['Last Name','Visitor'],['Email',visitorData.email],['Phone',visitorData.phone]]as const)await publicPage.getByLabel(label,{exact:true}).fill(value);
  await publicPage.getByRole('radio',{name:'No',exact:true}).check();await publicPage.getByLabel('What best describes you?').selectOption('interested');await publicPage.getByLabel('Anything you’d like the agent to know?',{exact:false}).fill(visitorData.notes);
  await publicPage.getByRole('checkbox',{name:'I agree to this contact disclosure.'}).check();
  expect(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await publicPage.screenshot({path:info.outputPath('open-house-visitor.png'),fullPage:true});
  await publicPage.getByRole('button',{name:'Sign In to Open House'}).click();await expect(publicPage.getByRole('heading',{name:'You’re signed in.'})).toBeVisible();await expect(publicPage.getByRole('link',{name:'View Property',exact:true})).toHaveAttribute('href',propertyUrl);
  // Retrying the same email is idempotent, without revealing prior attendees.
  expect((await guest.request.post(`/api/open-house-sign-in/${id}`,{headers:{origin},data:visitorData})).status()).toBe(200);
  const tampered=await guest.request.post(`/api/open-house-sign-in/${id}`,{headers:{origin},data:{...visitorData,firstName:'Jordan',email:'jordan.visitor@example.test',owner_id:other.id,listing_slug:'other-property',open_house_id:randomUUID(),created_at:'2000-01-01T00:00:00Z',p_fingerprint:'b'.repeat(64)}});expect(tampered.status()).toBe(200);expect(Object.keys(await tampered.json()).sort()).toEqual(['propertyUrl','signedIn']);
  await management.getByRole('button',{name:'Refresh Attendees'}).click();await expect(management.getByRole('heading',{name:'2 Attendees'})).toBeVisible();const cards=management.locator('.oh-attendee');await expect(cards).toHaveCount(2);await expect(cards.first()).toContainText('Jordan Visitor');await expect(cards).toContainText(['Jordan Visitor','Avery Visitor']);
  for(const text of [visitorData.email,visitorData.phone,'Working with Realtor?','No','Interested in this property',visitorData.notes])await expect(cards.last()).toContainText(text);
  for(const path of [`/api/open-houses/${id}/attendees`,`/api/properties/${property.slug}/open-houses`])expect((await second.request.get(path)).status()).toBe(404);
  expect((await second.request.patch(`/api/open-houses/${id}`,{headers:{origin},data:{state:'closed'}})).status()).toBe(404);
  const base=process.env.SUPABASE_URL!,key=process.env.SUPABASE_SECRET_KEY!;
  const tokenResponse=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:other.email,password:other.password})});expect(tokenResponse.ok).toBe(true);const jwt=(await tokenResponse.json()).access_token;
  const forbidden=await fetch(base+'/rest/v1/listory_open_house_attendees?select=id,email',{headers:{apikey:key,Authorization:'Bearer '+jwt}});expect(await forbidden.json()).toEqual([]);
  const stored=await fetch(base+`/rest/v1/listory_open_house_attendees?open_house_id=eq.${id}&select=owner_id,listing_slug,created_at,consent_version`,{headers:{apikey:key}});const records=await stored.json();expect(records).toHaveLength(2);for(const row of records){expect(row.owner_id).toBe(owner.id);expect(row.listing_slug).toBe(property.slug);expect(new Date(row.created_at).getFullYear()).not.toBe(2000);expect(row.consent_version).toBe('open-house-v1');}
  const bulk=Array.from({length:49},(_,i)=>({open_house_id:id,listing_slug:property.slug,owner_id:owner.id,first_name:'Pagination',last_name:`Visitor ${i}`,email:`page-${i}@example.test`,phone:'604-555-0100',working_with_realtor:false,buyer_status:'browsing',notes:'Private pagination fixture',submission_fingerprint:'c'.repeat(64)}));
  const seeded=await fetch(base+'/rest/v1/listory_open_house_attendees',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(bulk)});expect(seeded.ok).toBe(true);
  await management.getByRole('button',{name:'Refresh Attendees'}).click();await expect(management.getByRole('heading',{name:'51 Attendees'})).toBeVisible();await expect(cards).toHaveCount(50);await management.getByRole('button',{name:'Load More Attendees'}).click();await expect(cards).toHaveCount(51);await expect(management.getByRole('button',{name:'Load More Attendees'})).toHaveCount(0);
  const privateData=await page.request.get(`/api/open-houses/${id}/attendees`);expect(privateData.headers()['cache-control']).toContain('private');expect(await privateData.text()).not.toContain('submission_fingerprint');
  expect((await guest.request.get(`/api/open-house-sign-in/${id}`)).status()).toBe(405);
  const publicAgain=await guest.request.get(eventPath);const html=await publicAgain.text();for(const privateText of [visitorData.email,'Jordan Visitor',visitorData.notes,'PRIVATE EVENT NOTE',owner.id])expect(html).not.toContain(privateText);
  await management.getByRole('button',{name:'Close Sign-In',exact:true}).click();await expect(management.getByRole('button',{name:'Reopen Sign-In'})).toBeVisible();await publicPage.reload();await expect(publicPage.getByRole('heading',{name:'Sign-in is unavailable.'})).toBeVisible();expect((await guest.request.post(`/api/open-house-sign-in/${id}`,{headers:{origin},data:visitorData})).status()).toBe(404);
  expect((await guest.request.get('/property/'+property.slug)).status()).toBe(200);
  await page.getByRole('button',{name:'Generate Marketing Package',exact:true}).click();await expect(page.getByAltText('QR code for the published property page')).toBeVisible();await expect(page.locator('.published-url')).toHaveAttribute('href',propertyUrl);
  for(const [option,count,width]of [['Standard 8.5',4,612],['Folded 11',2,1224]]as const){
   await page.getByRole('button',{name:'Download PDF',exact:true}).click();const download=page.waitForEvent('download',{timeout:65000});await page.getByRole('button',{name:new RegExp(option)}).click();const file=await download;const path=info.outputPath(count===4?'Open-House-Property-Letter.pdf':'Open-House-Property-Folded.pdf');await file.saveAs(path);
   const lib=await import('pdfjs-dist/legacy/build/pdf.mjs'),task=lib.getDocument({data:new Uint8Array(await readFile(path)),useSystemFonts:false});
   try{const pdf=await task.promise;expect(pdf.numPages).toBe(count);for(let i=1;i<=count;i++){const p=await pdf.getPage(i),v=p.getViewport({scale:1});expect([v.width,v.height]).toEqual([width,792]);const text=(await p.getTextContent()).items.filter(x=>'str'in x).map(x=>x.str).join(' ');for(const secret of [visitorData.email,'PRIVATE ATTENDEE NOTE','PRIVATE EVENT NOTE',eventUrl])expect(text).not.toContain(secret);}const back=await pdf.getPage(count===4?4:1),viewport=back.getViewport({scale:300/72}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await back.render({canvas:canvas as never,canvasContext:canvas.getContext('2d')as never,viewport}).promise;const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);expect(jsQR(new Uint8ClampedArray(pixels.data),canvas.width,canvas.height)?.data).toBe(propertyUrl);}finally{await task.destroy();}
  }
 }finally{await guest.close();await second.close();await owner.cleanup();await other.cleanup();}
});
