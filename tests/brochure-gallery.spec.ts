import { test, expect } from './helpers/visual-fixture';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';

test('balances all gallery counts and orientations, with fixed composition and matching PDF artwork', async ({ page }, info) => {
  test.setTimeout(240_000);
  const colours = [[190, 45, 62], [30, 128, 178], [149, 58, 194], [219, 133, 26], [70, 151, 80], [185, 75, 130], [48, 70, 166], [170, 159, 38], [23, 145, 141], [137, 83, 42], [98, 115, 188], [182, 110, 170], [107, 165, 42], [24, 107, 167], [188, 64, 22]];
  const cases = [[1.5], [.6], [1.5, 1.5], [.6, .6], [1.5, .6], [1.5, 1.5, 1.5], [1.5, .6, 1.5], [1.5,1.5,1.5,1.5], [.6,1.5,1.5,1.5], [1.5,.6,1.5,1.5], [1.5,1.5,.6,1.5], [1.5,1.5,1.5,.6], [.6,1.5,.6,1.5], [.6,.6,.6,.6], [1.5,.6,1,1.8,.65], Array.from({length:15},(_,i)=>[.6,1.5,1,2.5][i%4])];
  for (const [index, ratios] of cases.entries()) {
    await page.goto('/workspace#create-listing'); await page.reload();
    await page.getByLabel('Property address', { exact: false }).fill(`Gallery ${index}, Vancouver, BC`);
    await page.getByLabel('Property description').fill(index === 14 ? 'A considered home with beautiful spaces and thoughtful details. '.repeat(17) + 'FINAL GALLERY SENTENCE.' : 'Consider every detail. A beautiful home, with spaces designed for living.');
    const files = [{name:'cover.png',mimeType:'image/png',buffer:await sharp({create:{width:1800,height:1000,channels:3,background:'#7a8580'}}).png().toBuffer()}];
    for (const [i, ratio] of ratios.entries()) files.push({name:`gallery-${i}.png`,mimeType:'image/png',buffer:await sharp({create:{width:Math.round(1000*ratio),height:1000,channels:3,background:{r:colours[i][0],g:colours[i][1],b:colours[i][2]}}}).png().toBuffer()});
    await page.getByLabel('Property photos', { exact: true }).setInputFiles(files);
    await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
    await page.getByRole('button', { name: 'Page 2: Property', exact: true }).click();
    await expect(page.locator('.brochure-page-sheet[data-layout-ready=true]')).toBeVisible();
    const grid = page.locator('.brochure-photo-grid.photo-layout-ready'); await expect(grid.locator('img')).toHaveCount(ratios.length);
    let original: string | undefined;
    for (const width of [1440, 834, 390, 320]) {
      await page.setViewportSize({width,height:1000});
      const composition = await grid.locator('img').evaluateAll(images => JSON.stringify(images.map(img => ({left:(img as HTMLElement).style.left,top:(img as HTMLElement).style.top,width:(img as HTMLElement).style.width,height:(img as HTMLElement).style.height}))));
      if (!original) original = composition; else expect(composition).toBe(original);
      const frames = JSON.parse(composition).map(f=>({x:parseFloat(f.left),y:parseFloat(f.top),width:parseFloat(f.width),height:parseFloat(f.height)}));
      const bounds = await grid.evaluate(el=>({width:el.clientWidth,height:el.clientHeight}));
      for(const [i,a] of frames.entries()) {
        expect(a.x).toBeGreaterThanOrEqual(0); expect(a.y).toBeGreaterThanOrEqual(0);
        expect(a.x+a.width).toBeLessThanOrEqual(bounds.width+1); expect(a.y+a.height).toBeLessThanOrEqual(bounds.height+1);
        for(const b of frames.slice(i+1)) expect(a.x+a.width<=b.x+.5||b.x+b.width<=a.x+.5||a.y+a.height<=b.y+.5||b.y+b.height<=a.y+.5).toBe(true);
      }
      expect(await page.getByRole('article').evaluate(el=>el.clientWidth)).toBe(816);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    }
    await page.setViewportSize({width:1440,height:1200});
    if ([8,12,14,15].includes(index)) await page.locator('.brochure-page-sheet').screenshot({path:info.outputPath(`gallery-${index}.png`)});
    if (![9,14,15].includes(index)) continue;
    // Compute the visible photograph rectangles from the preview, including
    // contain letterboxing and the shared page fitting, then inspect real PDFs.
    const expected = await grid.locator('img').evaluateAll(images => {
      // Compare in fixed print-page coordinates. After a viewport change the
      // ResizeObserver may still be updating the preview's outer scale.
      const sheet=images[0].closest('.brochure-page-sheet')!.getBoundingClientRect(),previewScale=sheet.width/816;
      return images.map((img:HTMLImageElement)=>{const r=img.getBoundingClientRect(),css=getComputedStyle(img);let width=r.width/previewScale,height=r.height/previewScale,x=(r.x-sheet.x)/previewScale,y=(r.y-sheet.y)/previewScale;
        if(css.objectFit==='contain'){const scale=Math.min(width/img.naturalWidth,height/img.naturalHeight);const w=img.naturalWidth*scale,h=img.naturalHeight*scale;x+=(width-w)/2;y+=(height-h)/2;width=w;height=h;}
        return {x,y,width,height};});
    });
    for (const [label,count,width] of [['Standard 8.5',4,612],['Folded 11',2,1224]] as const) {
      await page.getByRole('button',{name:'Download PDF',exact:true}).click();
      const pending=page.waitForEvent('download',{timeout:65_000}); await page.getByRole('button',{name:new RegExp(label)}).click();
      const download=await pending, path=info.outputPath(`gallery-${index}-${count===4?'Letter':'Folded'}.pdf`);await download.saveAs(path);
      const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=pdfjs.getDocument({data:new Uint8Array(await readFile(path)),useSystemFonts:false});
      try {
        const pdf=await task.promise;expect(pdf.numPages).toBe(count);
        for(let p=1;p<=count;p++){const v=(await pdf.getPage(p)).getViewport({scale:1});expect([v.width,v.height]).toEqual([width,792]);}
        const p=await pdf.getPage(2),v=p.getViewport({scale:4/3}),canvas=createCanvas(Math.ceil(v.width),Math.ceil(v.height));
        await p.render({canvas:canvas as never,canvasContext:canvas.getContext('2d') as never,viewport:v}).promise;
        const data=canvas.getContext('2d').getImageData(0,0,816,1056).data;
        for(const [i,target] of colours.slice(0,ratios.length).entries()) {
          let minX=816,minY=1056,maxX=-1,maxY=-1;
          for(let y=0;y<1056;y++)for(let x=0;x<816;x++){const offset=(y*816+x)*4;if(target.every((c,k)=>Math.abs(data[offset+k]-c)<9)){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
          const actual={x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1};
          for(const key of ['x','y','width','height'] as const) expect(Math.abs(actual[key]-expected[i][key]),`photo ${i+1} ${key}: preview and ${label}`).toBeLessThan(3);
        }
      } finally {await task.destroy();}
    }
  }
});
