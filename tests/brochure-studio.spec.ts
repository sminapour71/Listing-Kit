import {test,expect} from './helpers/studio-real-profile';
import {readFile} from 'node:fs/promises';
import {PDFName,PDFDict,PDFDocument} from 'pdf-lib';
import {createCanvas} from '@napi-rs/canvas';
import jsQR from 'jsqr';
import sharp from 'sharp';
const destination='https://listory.ca/property/1806-1480-howe-street';
const styles=['Listory Original','Montserrat Minimalist','Classic Editorial'];
const formats=['Double-Sided Letter','Existing Letter Brochure','Large Folded Brochure'];
for (const [kind,address,description,plan,colour] of [
 ['detached','2847 West 35th Avenue, Vancouver, BC','A detached home with generous living spaces. A private garden and double garage complete the property.',true,'#244b3d'],
 ['portrait','1840 Print Proof Avenue, Vancouver, BC','Portrait floor-plan print fixture.',true,'#244b3d'],
 ['condo','Penthouse 2305 — 1480 Howe Street at the Waterfront Residences, Yaletown, Vancouver, BC','A modern condominium with open living and dining areas. '.repeat(12),false,'#763d3a'],
 ['genuine','Saved Brand Profile Print Proof, Vancouver, BC','Private brand-profile verification.',false,'#244b3d'],
 ['loft','305 — 123 Warehouse Lane, Vancouver, BC','Converted loft. Open living spaces.',false,'#d9c98d'],
] as const) test(`${kind}: nine style/format PDFs retain sizes, panel order, fonts and scannable property QRs`,async({page},info)=>{
 test.setTimeout(600_000);
 test.skip(kind==='genuine'&&!process.env.LISTORY_BRAND_PROOF_FILE,'Optional read-only proof of the owner’s already-public branding.');
 const planWidth=kind==='portrait'?612:792,planHeight=kind==='portrait'?792:612;
 const genuine=kind==='genuine'?JSON.parse(await readFile(process.env.LISTORY_BRAND_PROOF_FILE!,'utf8')):null;
 // Publishing bindings are deliberately mocked; artwork/PDF generation is real.
 // No fake listing is written to the shared production database.
 await page.route('**/api/properties/**',async route=>{
  const request=route.request();if(request.url().includes('/open-houses'))return route.fulfill({json:{events:[],address,published:true}});
  if(request.url().endsWith('/delete'))return route.fulfill({json:{openHouses:0,attendees:0,status:'published',updated_at:new Date().toISOString()}});
  if(request.url().includes('/assets'))return route.fulfill({json:{url:'https://example.invalid/00000000-0000-0000-0000-000000000001.jpg',width:1800,height:1200}});
  return route.fulfill({json:{slug:'1806-1480-howe-street',url:destination,status:'published'}});
 });
 await page.route('**/api/properties',route=>route.request().method()==='POST'?route.fulfill({status:201,json:{slug:'1806-1480-howe-street',url:destination,status:'draft'}}):route.fulfill({json:{properties:[]}}));
 const firstName=genuine?.firstName||(kind==='condo'?'Maya':'Alexandra-Catherine'),lastName=genuine?.lastName||(kind==='condo'?'Lee':'Montgomery-Richardson');
 if(genuine){expect((await page.request.put('/api/agent-profile',{headers:{origin:'http://127.0.0.1:3100'},data:{brand:genuine}})).status()).toBe(200);await page.goto('/workspace#brand-profile');await expect(page.getByLabel('First name',{exact:true})).toHaveValue(firstName);}else{
 await page.goto('/workspace#brand-profile');
 await page.getByLabel('First name',{exact:true}).fill(firstName);await page.getByLabel('Last name',{exact:true}).fill(lastName);
 // Save/reload through the real private Brand Profile API, never a profile mock.
 const primary=page.getByLabel('Primary brand colour',{exact:true});if(await primary.count())await primary.fill(colour);
 await page.getByLabel('Team name',{exact:true}).fill('Harbour Property Group');await page.getByLabel('Website',{exact:true}).fill('harbour.example');await page.getByLabel('Brokerage name',{exact:true}).fill('Harbour Realty');await page.getByLabel('Phone number',{exact:true}).fill('604-555-0198');await page.getByLabel('Email',{exact:true}).fill('agent@example.test');
 for(const [label,file]of [['Headshot','portrait'],['Personal logo','team-logo'],['Brokerage logo','brokerage-logo']]){if(kind==='loft'&&label!=='Brokerage logo'){const remove=page.getByRole('button',{name:'Remove '+label.toLowerCase(),exact:true});if(await remove.count())await remove.click();continue;}await page.getByLabel(label,{exact:true}).setInputFiles('tests/fixtures/print-'+file+'.png');await expect(page.getByAltText(label+' preview')).toBeVisible();}
 await expect(page.getByAltText('Brokerage logo preview')).toBeVisible();
 await page.getByRole('button',{name:/Save Brand Profile/}).click();
 await expect(page.getByText('Looking like you.',{exact:true})).toBeVisible();
 }
 const savedBrand=(await (await page.request.get('/api/agent-profile')).json()).brand;expect(savedBrand.firstName).toBe(firstName);expect(savedBrand.brokerageName).toBe(genuine?.brokerageName||'Harbour Realty');if(genuine)expect(savedBrand).toEqual(genuine);
 await page.goto('/workspace#create-listing');
 for(const [label,value]of Object.entries({'Property address':address,'Listing price':'2345000',Bedrooms:'3',Bathrooms:'2','Square footage':'1875','Property description':description,'Property features':kind==='loft'?'':'Private garden, Double garage, Storage, Generous living spaces, Dining area, Home office'}))await page.getByLabel(label,{exact:false}).fill(value);
 const portrait=await sharp(await readFile('public/images/property-3.jpg')).resize(500,900,{fit:'cover'}).jpeg().toBuffer();
 await page.getByLabel('Property photos',{exact:true}).setInputFiles([
  {name:'landscape.jpg',mimeType:'image/jpeg',buffer:await readFile('public/images/property-1.jpg')},
  {name:'cover.jpg',mimeType:'image/jpeg',buffer:await readFile('public/images/property-2.jpg')},
  {name:'portrait.jpg',mimeType:'image/jpeg',buffer:portrait},
  {name:'architecture.jpg',mimeType:'image/jpeg',buffer:await readFile('public/images/hero.jpg')},
 ]);
 await expect(page.locator('.listing-photo-row')).toHaveCount(4,{timeout:30000});
 if(plan||kind==='condo'){await expect(page.getByLabel('Floor plan',{exact:true})).toBeEnabled();await page.getByLabel('Floor plan',{exact:true}).setInputFiles(`tests/fixtures/print-${kind==='portrait'?'portrait':plan?'detailed':'simple'}-plan.pdf`);await expect(page.getByAltText('Selected floor plan',{exact:true})).toBeVisible({timeout:30000});}
 await page.getByRole('button',{name:'Generate Marketing Package',exact:true}).click();
 await page.getByRole('button',{name:'Publish Property Page',exact:true}).click();
 await expect(page.getByAltText('QR code for the published property page')).toBeVisible({timeout:30000});
 await page.getByText('Cover photograph & optional captions',{exact:true}).click();
 await page.getByRole('button',{name:'Use photo 2 as brochure cover',exact:true}).click();
 await page.getByLabel('Photo 2 caption (optional)',{exact:true}).fill('Exterior perspective.');
 await page.getByRole('button',{name:'Adjust brochure cover position',exact:true}).click();
 await page.getByRole('group',{name:'Photo position preview'}).press('ArrowRight');await page.getByRole('button',{name:'Save',exact:true}).click();
 for(const [si,style]of styles.entries())for(const [fi,format]of formats.entries()){
  await page.getByRole('button',{name:new RegExp('^'+style)}).click();await page.getByRole('button',{name:new RegExp('^'+format)}).click();
  await expect(page.locator('.brochure-page-sheet').first()).toHaveAttribute('data-layout-ready','true');
  const legacyWeights=await page.evaluate(()=>Array.from(document.fonts).filter(f=>f.family.replaceAll("'",'').replaceAll('"','')==='Bodoni Moda').map(f=>f.weight));
  expect(legacyWeights.length).toBeGreaterThan(0);expect(legacyWeights.every(w=>w==='500')).toBe(true);
  await page.locator('.brochure-preview-scale').screenshot({path:info.outputPath(`${kind}-${si}-${fi}-preview.png`)});
  if(si===0&&fi===0){
   await page.getByRole('button',{name:'Next Page',exact:true}).click();
   await page.getByLabel('Photo 1 caption (optional)',{exact:true}).fill('Entry view.');
   await expect(page.locator('.brochure-view-toolbar')).toContainText('Back');
   if(kind!=='condo')await expect(page.getByRole('article')).toContainText('Entry view.');
   await expect(page.getByRole('article').getByAltText(/^Floor plan for/)).toHaveCount(kind==='condo'?1:0);
   await page.getByRole('button',{name:'Previous Page',exact:true}).click();
  }

  const pending=page.waitForEvent('download',{timeout:90000});
  await page.getByRole('button',{name:'Download PDF',exact:true}).click();
  const response=page.waitForResponse(r=>r.url().endsWith('/api/brochure-pdf'));
  await page.getByRole('button',{name:/Download selected format/}).click();
  const result=await response;expect(result.status(),await result.text().then(()=>result.status()===200?'': 'PDF endpoint rejected artwork')).toBe(200);
  const download=await pending, file=info.outputPath(`${kind}-${si}-${fi}.pdf`);await download.saveAs(file);
  const bytes=await readFile(file),pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBe(fi===1?4:2);
  const embeddedFonts=pdf.context.enumerateIndirectObjects().flatMap(([,o])=>o instanceof PDFDict?[o.get(PDFName.of('BaseFont'))?.toString()||'']:[]).join(' ');
  if(si===1)expect(embeddedFonts).toMatch(/Montserrat/);if(si===2)expect(embeddedFonts).toMatch(/Bodoni/);
  expect(pdf.context.enumerateIndirectObjects().some(([,o])=>o instanceof PDFDict&&(o.has(PDFName.of('FontFile2'))||o.has(PDFName.of('FontFile3'))))).toBe(true);
  for(const p of pdf.getPages()){expect(p.getWidth()).toBe(fi===2?1224:612);expect(p.getHeight()).toBe(792);}
  const lib=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=lib.getDocument({data:new Uint8Array(bytes),useSystemFonts:false});const doc=await task.promise;
  try{
   const qrPage=await doc.getPage(fi===1?4:fi===2?1:2);const vp=qrPage.getViewport({scale:2.5}),canvas=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height));
   await qrPage.render({canvas:canvas as never,canvasContext:canvas.getContext('2d') as never,viewport:vp}).promise;
   const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);const decoded=jsQR(new Uint8ClampedArray(pixels.data),canvas.width,canvas.height);expect(decoded?.data).toBe(destination);if(fi===2)expect(decoded!.location.topLeftCorner.x).toBeLessThan(canvas.width/2);
   const texts=[];for(let n=1;n<=doc.numPages;n++){const p=await doc.getPage(n),content=await p.getTextContent();texts.push(content.items.filter(x=>'str'in x).map(x=>x.str).join(' '));for(const item of content.items){if(!('str'in item)||!item.str.trim())continue;expect(item.transform[5],item.str).toBeGreaterThan(15);expect(item.transform[5],item.str).toBeLessThan(777);}const operatorList=await p.getOperatorList();expect(operatorList.fnArray.length).toBeGreaterThan(20);}
   if(plan||kind==='condo'){
    const pageNumber=fi===0?2:fi===1?3:2,ops=await(await doc.getPage(pageNumber)).getOperatorList();
    let matrix=[1,0,0,1,0,0];const stack:number[][]=[],boxes:{width:number;height:number}[]=[];
    for(let i=0;i<ops.fnArray.length;i++){const op=ops.fnArray[i],args=ops.argsArray[i];
     if(op===lib.OPS.save)stack.push([...matrix]);
     else if(op===lib.OPS.restore)matrix=stack.pop()||[1,0,0,1,0,0];
     else if(op===lib.OPS.transform)matrix=lib.Util.transform(matrix,args);
     else if(op===lib.OPS.paintFormXObjectBegin){stack.push([...matrix]);if(args[0])matrix=lib.Util.transform(matrix,args[0]);}
     else if(op===lib.OPS.paintFormXObjectEnd)matrix=stack.pop()||[1,0,0,1,0,0];
     else if(op===lib.OPS.paintImageXObject&&Math.abs(args[1]/args[2]-(plan?planWidth/planHeight:300/240))<.004)boxes.push({width:Math.hypot(matrix[0],matrix[1]),height:Math.hypot(matrix[2],matrix[3])});
    }
    if(fi===0&&plan)expect(boxes).toHaveLength(0);
    else{expect(boxes.length).toBeGreaterThan(0);const box=boxes.sort((a,b)=>b.width-a.width)[0];expect(Math.abs(box.width/box.height-(plan?planWidth/planHeight:300/240))).toBeLessThan(.01);expect((plan?12:16)*box.width/(plan?planWidth:300)).toBeGreaterThanOrEqual(fi===0?8:7);}
   }
   expect(texts.join(' ')).toContain(lastName);for(const key of ['firstName','lastName','teamName','brokerageName','phone','email','website'])if(savedBrand[key])expect(texts.join(' ').replace(/\s/g,'')).toContain(savedBrand[key].replace(/\s/g,''));expect(texts.join(' ')).not.toMatch(/Property photograph supplied|Supporting photograph supplied|Jamie Davis|West Coast Realty|Add a floor plan|Add your headshot|Add property features|Add additional photographs/);
   if(fi===2){const first=await doc.getPage(1),content=await first.getTextContent();const price=content.items.find(x=>'str'in x&&x.str.includes('$2,345,000'));expect(price&&'transform'in price?price.transform[4]:0).toBeGreaterThanOrEqual(612);}
  }finally{await task.destroy();}
  await expect(page.getByRole('dialog')).not.toBeVisible();
 }
 await page.getByRole('button',{name:'Back to Listing',exact:true}).click();
 await page.getByRole('button',{name:'Move photo 2 earlier',exact:true}).click();
 await page.getByRole('button',{name:'Generate Marketing Package',exact:true}).click();
 await page.getByText('Cover photograph & optional captions',{exact:true}).click();
 await expect(page.getByRole('button',{name:'Use photo 1 as brochure cover',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByLabel('Photo 1 caption (optional)',{exact:true})).toHaveValue('Exterior perspective.');
});

test('a real listing without a Brand Profile never inherits demonstration branding',async({page},info)=>{
 const {defaultBrandProfile}=await import('../app/lib/brand-profile');
 expect((await page.request.put('/api/agent-profile',{headers:{origin:'http://127.0.0.1:3100'},data:{brand:defaultBrandProfile}})).status()).toBe(200);
 await page.route('**/api/properties',route=>route.fulfill({json:{properties:[]}}));
 await page.goto('/workspace#create-listing');await page.getByLabel('Property address',{exact:false}).fill('Private unbranded print verification');
 await page.getByRole('button',{name:'Generate Marketing Package',exact:true}).click();
 await expect(page.locator('.package-summary')).toContainText('BRAND PROFILE NOT ADDED');
 await expect(page.getByRole('article')).not.toContainText('Jamie Davis');await expect(page.getByRole('article')).not.toContainText('West Coast Realty');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download PDF',exact:true}).click();await page.getByRole('button',{name:/Download selected format/}).click();const file=await pending;const bytes=await readFile((await file.path())!);const lib=await import('pdfjs-dist/legacy/build/pdf.mjs'),task=lib.getDocument({data:new Uint8Array(bytes),useSystemFonts:false}),pdf=await task.promise;
 try{const text=[];for(let i=1;i<=pdf.numPages;i++)text.push((await (await pdf.getPage(i)).getTextContent()).items.filter(x=>'str'in x).map(x=>x.str).join(' '));expect(text.join(' ')).not.toMatch(/Jamie Davis|The Davis Group|West Coast Realty|jamie@example.com|Your realtor|Your brokerage|Add your headshot/);}finally{await task.destroy();}
});
