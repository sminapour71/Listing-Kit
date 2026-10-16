import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';

test('only the cover fills edge-to-edge and matches its saved focal crop in both PDFs', async ({ page }, info) => {
  test.setTimeout(150_000);
  for (const [name,width,height] of [['portrait',750,1500],['panorama',3000,750],['square',1000,1000]] as const) {
    await page.goto('/#create-listing'); await page.reload();
    await page.getByLabel('Property address', {exact:false}).fill(`Cover Verification ${name}, Vancouver, BC`);
    let cells='';for(let y=0;y<10;y++)for(let x=0;x<10;x++)cells+=`<rect x="${x*width/10}" y="${y*height/10}" width="${width/10}" height="${height/10}" fill="rgb(${44+x*18},${50+y*17},120)"/>`;
    const buffer=await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${cells}</svg>`)).png().toBuffer();
    await page.getByLabel('Property photos',{exact:true}).setInputFiles({name:`${name}.png`,mimeType:'image/png',buffer});
    await page.getByRole('button',{name:'Adjust Position for photo 1',exact:true}).click();
    const editor=page.getByRole('group',{name:'Photo position preview'});
    for(let i=0;i<10;i++)await editor.press('ArrowLeft');
    for(let i=0;i<5;i++)await editor.press('ArrowDown');
    await page.getByRole('button',{name:'Save',exact:true}).click();
    await page.getByRole('button',{name:'Generate Marketing Package',exact:true}).click();
    const cover=page.locator('.brochure-cover-image');
    await expect(cover).toHaveCSS('object-fit','cover');
    expect(Number(await cover.getAttribute('data-photo-focal-x'))).toBeCloseTo(.7);
    expect(Number(await cover.getAttribute('data-photo-focal-y'))).toBeCloseTo(.4);
    await expect(cover).not.toHaveCSS('object-position','50% 50%');
    let position: string | undefined;
    for(const viewportWidth of [390,834,1440]){
      await page.setViewportSize({width:viewportWidth,height:1200});
      await expect(cover).toHaveCSS('object-fit','cover');
      const current=await cover.evaluate(el=>getComputedStyle(el).objectPosition);
      if(position===undefined)position=current;else expect(current).toBe(position);
    }
    const sheet=page.locator('.brochure-page-sheet[data-layout-ready=true]');await expect(sheet).toBeVisible();
    const frame=await cover.evaluate(el=>{const r=el.getBoundingClientRect(),s=el.closest('.brochure-page-sheet')!.getBoundingClientRect();return{x:r.x-s.x,y:r.y-s.y,width:r.width,height:r.height};});
    const screenshot=await sheet.screenshot({path:info.outputPath(`${name}-preview.png`)});
    const png=await sharp(screenshot).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    // Probe every edge as well as the interior. None may show the cream frame.
    const probes=[[.01,.01],[.5,.01],[.99,.01],[.01,.46],[.43,.46],[.99,.46],[.01,.99],[.5,.99],[.99,.99]].map(([x,y])=>({x:Math.round(frame.x+x*frame.width),y:Math.round(frame.y+y*frame.height)}));
    const expected=probes.map(({x,y})=>{const i=(y*png.info.width+x)*4;return[...png.data.subarray(i,i+3)];});
    for(const rgb of expected){expect(rgb[2]).toBeGreaterThan(110);expect(rgb[2]).toBeLessThan(130);}
    for(const [label,count,pageWidth] of [['Standard 8.5',4,612],['Folded 11',2,1224]] as const){
      await page.getByRole('button',{name:'Download PDF',exact:true}).click();
      const pending=page.waitForEvent('download',{timeout:65_000});
      await page.getByRole('button',{name:new RegExp(label)}).click();
      const download=await pending,path=info.outputPath(`${name}-${count===4?'Letter':'Folded'}.pdf`);await download.saveAs(path);
      const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=pdfjs.getDocument({data:new Uint8Array(await readFile(path)),useSystemFonts:false});
      try{
        const pdf=await task.promise;expect(pdf.numPages).toBe(count);
        for(let i=1;i<=count;i++){const v=(await pdf.getPage(i)).getViewport({scale:1});expect([v.width,v.height]).toEqual([pageWidth,792]);}
        const coverPage=await pdf.getPage(1),viewport=coverPage.getViewport({scale:4/3}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
        await coverPage.render({canvas:canvas as never,canvasContext:canvas.getContext('2d') as never,viewport}).promise;
        const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        for(const [i,p]of probes.entries()){
          const offset=(p.y*canvas.width+p.x+(count===2?816:0))*4;
          for(let channel=0;channel<3;channel++)expect(Math.abs(pixels[offset+channel]-expected[i][channel]),`${name} ${label} crop at probe ${i}`).toBeLessThan(12);
        }
      }finally{await task.destroy();}
    }
  }
});
