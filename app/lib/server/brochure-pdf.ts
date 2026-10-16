import { applyGalleryLayouts, measurePhotoGrids, galleryLayout, applyBrochureSheetFits, compactBrochureSheets, measureBrochureSheets } from '../brochure-layout';
import { describePhoto, focalPosition, photoFit, photoPosition, type PhotoMode } from '../photo-fitting';
import chromium from '@sparticuz/chromium';
import { chromium as playwright, type Browser, type Page } from 'playwright-core';
import { PDFDocument, Duplex, PrintScaling } from 'pdf-lib';
import sanitizeHtml from 'sanitize-html';
import sharp from 'sharp';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDF_ASSET_ORIGIN, PDF_RESPONSE_LIMIT, type PdfRequest } from '../pdf-contract';

export class PdfExportError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}
let executable: Promise<string> | undefined;
let printStyles: Promise<string> | undefined;
let activeRenders = 0;

async function localExecutable(): Promise<string | undefined> {
  if (process.env.VERCEL) return undefined;
  if (process.env.PDF_CHROMIUM_PATH) return process.env.PDF_CHROMIUM_PATH;
  const candidates: string[] = [];
  if (process.platform === 'win32') {
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean)) {
      candidates.push(path.join(base!, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(base!, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  } else return undefined;
  for (const file of candidates) { try { await access(file); return file; } catch {} }
  throw new PdfExportError('To download PDFs on this computer, please use the online Listory preview, or install Microsoft Edge or Google Chrome.');
}

async function loadStyles() {
  // These files are explicitly included in the Vercel function trace.
  const [global, reset] = await Promise.all([
    readFile(path.join(process.cwd(), 'app/globals.css'), 'utf8'),
    readFile(path.join(process.cwd(), 'node_modules/tailwindcss/preflight.css'), 'utf8'),
  ]);
  const fonts = [
    ['Listory Brochure Sans', 'arimo', '400', 'normal'], ['Listory Brochure Sans', 'arimo', '700', 'normal'],
    ['Listory Brochure Serif', 'gelasio', '400', 'normal'], ['Listory Brochure Serif', 'gelasio', '400', 'italic'],
    ['Listory Brochure Serif', 'gelasio', '700', 'normal'], ['Bodoni Moda', 'bodoni-moda', '500', 'normal'],
  ];
  const faces = await Promise.all(fonts.map(async ([family, file, weight, style]) => {
    const data = await readFile(path.join(process.cwd(), 'node_modules/@fontsource', file, 'files', `${file}-latin-${weight}-${style}.woff2`));
    return `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2');font-display:block}`;
  }));
  return faces.join('\n') + '\n' + reset + '\n' + global.replace(/@import\s+['"]tailwindcss['"];?/, '').replace(/@font-face\{font-family:'Listory Brochure (?:Sans|Serif)'[^}]+\}/g, '');
}

function cleanPage(html: string, index: number) {
  if (typeof html !== 'string' || html.length > 180_000 || !html.includes(`brochure-page-${index + 1}`)) throw new PdfExportError('The brochure artwork could not be read. Please generate the marketing package again.', 400);
  return sanitizeHtml(html, {
    allowedTags: ['article', 'div', 'span', 'h2', 'h3', 'p', 'footer', 'img', 'ul', 'li', 'section', 'dl', 'dt', 'dd', 'em', 'strong', 'small', 'br', 'i', 'svg', 'path', 'line', 'rect', 'circle', 'polyline', 'polygon'],
    allowedAttributes: {
      '*': ['class'], article: ['class', 'style'], img: ['src', 'alt', 'data-photo-mode', 'data-photo-position', 'data-photo-focal-x', 'data-photo-focal-y'],
      svg: ['class', 'xmlns', 'viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
      path: ['d'], line: ['x1', 'x2', 'y1', 'y2'], rect: ['x', 'y', 'width', 'height', 'rx', 'ry'], circle: ['cx', 'cy', 'r'], polyline: ['points'], polygon: ['points'],
    },
    allowedStyles: { '*': Object.fromEntries(['--brochure-primary', '--brochure-secondary', '--brochure-primary-ink', '--brochure-secondary-ink'].map(key => [key, [/^#[0-9a-f]{6}$/i]])) },
    allowedSchemes: ['https'], allowProtocolRelative: false,
    parser: { lowerCaseAttributeNames: false },
    transformTags: { img: (_tagName, attributes) => ({ tagName: 'img', attribs: { ...attributes, src: new RegExp(`^${PDF_ASSET_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}image-\\d+$`).test(attributes.src || '') ? attributes.src : '' } }) },
  });
}

// Measure the actual print frames, then use the same pure fitting policy as
// PropertyPhoto. Re-run after print-only compacting, before page.pdf().
async function fitPropertyPhotos(page: Page) {
  const sources = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLImageElement>('img[data-photo-mode]')).map(img => ({ width: img.naturalWidth, height: img.naturalHeight, mode: img.dataset.photoMode, position: img.dataset.photoPosition, focalX: img.dataset.photoFocalX === undefined ? undefined : Number(img.dataset.photoFocalX), focalY: img.dataset.photoFocalY === undefined ? undefined : Number(img.dataset.photoFocalY) })));
  const metadata = sources.map(source => ({ ...describePhoto(source.width, source.height), position: photoPosition(source.position) }));
  await page.evaluate(values => { document.querySelectorAll<HTMLImageElement>('img[data-photo-mode]').forEach((image, i) => {
    image.dataset.photoOrientation = values[i].orientation!;
    image.dataset.photoRatio = String(values[i].aspectRatio);
    image.setAttribute('width', String(values[i].width)); image.setAttribute('height', String(values[i].height));
  }); }, metadata);
  await page.evaluate(applyGalleryLayouts, (await page.evaluate(measurePhotoGrids as () => ReturnType<typeof measurePhotoGrids>)).map(galleryLayout));
  const frames = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLImageElement>('img[data-photo-mode]')).map(img => { const css = getComputedStyle(img); return { width: parseFloat(css.width), height: parseFloat(css.height) }; }));
  const fits = sources.map((source, i) => { const frame = frames[i]; const fit = photoFit(source.width, source.height, frame.width, frame.height, ['feature', 'secondary', 'natural', 'cover'].includes(source.mode || '') ? source.mode as PhotoMode : 'feature'); return { fit, position: focalPosition(source, source.width, source.height, frame.width, frame.height, fit) }; });
  await page.evaluate(values => { document.querySelectorAll<HTMLImageElement>('img[data-photo-mode]').forEach((img, i) => { img.style.objectFit = values[i].fit; img.style.objectPosition = values[i].position; }); }, fits);
}

export async function renderBrochurePdf(input: PdfRequest, signal: AbortSignal): Promise<Uint8Array> {
  if (!input || !['letter', 'folded'].includes(input.format) || !Array.isArray(input.pages) || input.pages.length !== 4 || !Array.isArray(input.assets) || input.assets.length > 24 || typeof input.address !== 'string' || input.address.length > 500) throw new PdfExportError('Please choose a valid brochure format and try again.', 400);
  if (activeRenders >= 2) throw new PdfExportError('Other brochures are being prepared. Please try again in a moment.', 429);
  const pages = input.pages.map(cleanPage);
  const assets = new Map<string, { body: Buffer; contentType: string }>();
  for (const asset of input.assets) {
    if (!asset || !/^image-\d+$/.test(asset.id) || assets.has(PDF_ASSET_ORIGIN + asset.id) || typeof asset.data !== 'string') throw new PdfExportError('One of the brochure images could not be read. Please select it again.', 400);
    const match = /^data:image\/(png|jpeg);base64,([a-z0-9+/=]+)$/i.exec(asset.data);
    if (!match) throw new PdfExportError('Please use JPG or PNG brochure images and try again.', 400);
    const body = Buffer.from(match[2], 'base64');
    try {
      const image = await sharp(body, { limitInputPixels: 16_000_000 }).metadata();
      if (!['png', 'jpeg'].includes(image.format || '') || !image.width || !image.height || image.width > 3600 || image.height > 3600) throw new Error('Image dimensions');
    } catch { throw new PdfExportError('A brochure image could not be opened. Please choose the image again.', 400); }
    assets.set(PDF_ASSET_ORIGIN + asset.id, { body, contentType: `image/${match[1].toLowerCase()}` });
  }
  if (activeRenders >= 2) throw new PdfExportError('Other brochures are being prepared. Please try again in a moment.', 429);
  activeRenders++;
  let browser: Browser | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abort = () => { if (browser) void browser.close().catch(() => {}); };
  try {
    signal.throwIfAborted();
    // Packaged Chromium is used on Vercel and in production validation. The
    // optional local override supports Windows development without a new service.
    const localBrowser = await localExecutable();
    if (!localBrowser) executable ??= chromium.executablePath();
    browser = await playwright.launch({ executablePath: localBrowser || await executable!, args: localBrowser ? process.platform === 'linux' ? ['--no-sandbox'] : [] : chromium.args, headless: true, timeout: 20_000 });
    signal.addEventListener('abort', abort, { once: true });
    signal.throwIfAborted();
    timer = setTimeout(abort, 40_000);
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, javaScriptEnabled: false, serviceWorkers: 'block', acceptDownloads: false });
    // The renderer has no access to the web, local files, or arbitrary URLs.
    await context.route('**/*', async route => {
      const asset = assets.get(route.request().url());
      if (asset) await route.fulfill({ status: 200, contentType: asset.contentType, body: asset.body });
      else await route.abort('blockedbyclient');
    });
    const page = await context.newPage(); page.setDefaultTimeout(15_000);
    printStyles ??= loadStyles();
    const css = await printStyles;
    await page.emulateMedia({ media: 'screen' });
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src ${PDF_ASSET_ORIGIN}; font-src data:; script-src 'none'; frame-src 'none'; connect-src 'none'"><style id="brochure-styles">${css}</style><style>
      html,body{margin:0;padding:0;width:816px;background:#fff}
      .pdf-sheet{break-after:page;page-break-after:always;box-shadow:none}
      .pdf-sheet:last-child{break-after:auto;page-break-after:auto}
      .pdf-canvas .brochure-paper{outline:none!important;scroll-margin:0}
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;animation:none!important;transition:none!important}
      @page{size:8.5in 11in;margin:0}
    </style></head><body>${pages.map((artwork, index) => `<div class="pdf-sheet brochure-page-sheet" data-page="${index + 1}"><div class="brochure-page-artwork pdf-canvas">${artwork}</div></div>`).join('')}</body></html>`, { waitUntil: 'load', timeout: 20_000 });
    // Freeze the existing desktop rules before Chromium enters paged media.
    // This prevents a phone's screen size or print viewport from restyling art.
    await page.evaluate(async () => {
      const element = document.getElementById('brochure-styles') as HTMLStyleElement;
      function freeze(rules: CSSRuleList): string {
        return Array.from(rules).map(rule => {
          if (rule instanceof CSSMediaRule) return matchMedia(rule.conditionText).matches ? freeze(rule.cssRules) : '';
          if (rule instanceof CSSStyleRule || rule instanceof CSSFontFaceRule || rule instanceof CSSKeyframesRule) return rule.cssText;
          if ('cssRules' in rule) { const text = rule.cssText; return text.slice(0, text.indexOf('{') + 1) + freeze((rule as CSSGroupingRule).cssRules) + '}'; }
          return rule.cssText;
        }).join('\n');
      }
      element.textContent = freeze(element.sheet!.cssRules);
      await Promise.all([document.fonts.load('500 15px "Bodoni Moda"'), document.fonts.load('400 12px "Listory Brochure Serif"'), document.fonts.load('italic 400 12px "Listory Brochure Serif"'), document.fonts.load('400 12px "Listory Brochure Sans"'), document.fonts.load('700 12px "Listory Brochure Sans"')]);
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(image => image.decode()));
      if (!document.fonts.check('500 15px "Bodoni Moda"') || !document.fonts.check('400 12px "Listory Brochure Serif"')) throw new Error('Print fonts did not load');
    });
    await fitPropertyPhotos(page);
    let fit = await page.evaluate(measureBrochureSheets as () => ReturnType<typeof measureBrochureSheets>);
    if (fit.some(result => result.scale < .8)) {
      await page.evaluate(compactBrochureSheets, fit);
      await fitPropertyPhotos(page);
      fit = await page.evaluate(measureBrochureSheets as () => ReturnType<typeof measureBrochureSheets>);
    }
    for (const [index, result] of fit.entries()) {
      if (result.width > 818 || result.scale < .8) throw new PdfExportError(`Brochure page ${index + 1} has more content than fits at a readable print size. Please shorten ${index === 1 ? 'the property description or features' : 'the long property or contact details'}, then try again.`);
    }
    await page.evaluate(applyBrochureSheetFits, fit);
    signal.throwIfAborted();
    const letterBytes = await page.pdf({ width: '8.5in', height: '11in', printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true, margin: { top: 0, bottom: 0, left: 0, right: 0 }, tagged: true });
    const letter = await PDFDocument.load(letterBytes);
    if (letter.getPageCount() !== 4) throw new PdfExportError('The pages could not be fitted correctly. Please shorten the listing text and try again.');
    const output = input.format === 'folded' ? await PDFDocument.create() : letter;
    if (input.format === 'folded') {
      const panels = await output.embedPages(letter.getPages());
      // 72 PDF points per inch. Each panel remains exactly 612 × 792 points.
      for (const [left, right] of [[3, 0], [1, 2]]) {
        const spread = output.addPage([1224, 792]);
        spread.drawPage(panels[left], { x: 0, y: 0, width: 612, height: 792 });
        spread.drawPage(panels[right], { x: 612, y: 0, width: 612, height: 792 });
      }
    }
    output.setTitle(`${input.address} — Listory ${input.format === 'folded' ? 'Folded' : 'Letter'} Brochure`);
    output.setCreator('Listory'); output.setProducer('Listory');
    const preferences = output.catalog.getOrCreateViewerPreferences();
    preferences.setPrintScaling(PrintScaling.None);
    preferences.setDuplex(input.format === 'folded' ? Duplex.DuplexFlipShortEdge : Duplex.DuplexFlipLongEdge);
    for (const sheet of output.getPages()) { const { width, height } = sheet.getSize(); sheet.setTrimBox(0, 0, width, height); }
    const result = await output.save();
    if (result.byteLength > PDF_RESPONSE_LIMIT) throw new PdfExportError('This brochure is too large to download reliably. Try fewer photos or smaller image files and download again.');
    return result;
  } finally {
    if (timer) clearTimeout(timer);
    signal.removeEventListener('abort', abort);
    if (browser) await browser.close().catch(() => {});
    activeRenders--;
  }
}
