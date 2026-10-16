/** Fixed Letter artwork, independent of browser viewport. All units are CSS px. */
export const BROCHURE_WIDTH = 816;
export const BROCHURE_HEIGHT = 1056;
export type PhotoFrame = { x: number; y: number; width: number; height: number };
export type GalleryPlan = { width: number; height: number; frames: PhotoFrame[] };
export type GalleryMeasurement = { width: number; height: number; ratios: number[] };

/** Intentional justified rows/columns, with every frame explicitly placed.
 * Candidate orders affect placement only; the original photo indices survive.
 * Score actual aspect-ratio loss and penalize tiny frames, rather than relying
 * on CSS auto-placement or uncontrolled natural-height masonry.
 */
export function galleryLayout({ ratios, width, height }: GalleryMeasurement): GalleryPlan {
  const n = ratios.length, gap = 10;
  if (!n) return { width, height: 230, frames: [] };
  const maxHeight = Math.max(140, Math.min(height, 600));
  const aspects = ratios.map(r => Number.isFinite(r) && r > 0 ? r : 1.5);
  if (n === 1) { height = Math.max(80, Math.min(maxHeight, width / aspects[0])); return { width, height, frames: [{ x: 0, y: 0, width, height }] }; }
  if (n === 4 && aspects.every(r => r >= .9)) {
    height = Math.min(maxHeight, (width - gap) / 2 * aspects.reduce((sum, r) => sum + 1 / r, 0) / 2 + gap);
    return { width, height, frames: aspects.map((_, i) => ({ x: (i % 2) * (width + gap) / 2, y: Math.floor(i / 2) * (height + gap) / 2, width: (width - gap) / 2, height: (height - gap) / 2 })) };
  }
  const original = aspects.map((_, i) => i);
  const orders = [original, [...original].sort((a, b) => aspects[a] - aspects[b])];
  let best: GalleryPlan | undefined, bestScore = Infinity;
  // Bounded compositions: no more than four photos in a row/column.
  function partitions(remaining: number, groups: number[] = [], result: number[][] = []): number[][] {
    if (!remaining) result.push(groups);
    else for (let k = 1; k <= Math.min(4, remaining); k++) if (groups.length < 5) partitions(remaining - k, [...groups, k], result);
    return result;
  }
  const patterns = partitions(n);
  for (const order of orders) for (const columns of [false, true]) for (const pattern of patterns) {
    let offset = 0;
    const specs = pattern.map(count => {
      const indices = order.slice(offset, offset += count);
      const weights = indices.map(i => Math.max(.35, Math.min(3.5, columns ? 1 / aspects[i] : aspects[i])));
      return { indices, weights, sum: weights.reduce((a, b) => a + b, 0) };
    });
    // Solve the ideal gallery height before bounding it to the actual page.
    // This avoids padding caused solely by an arbitrary fixed gallery height.
    const idealHeight = columns
      ? (width - gap * (specs.length - 1) + specs.reduce((sum, g) => sum + gap * (g.indices.length - 1) / g.sum, 0)) / specs.reduce((sum, g) => sum + 1 / g.sum, 0)
      : specs.reduce((sum, g) => sum + (width - gap * (g.indices.length - 1)) / g.sum, 0) + gap * (specs.length - 1);
    height = Math.max(140, Math.min(maxHeight, idealHeight));
    const major = columns ? height : width, minor = columns ? width : height;
    const groups = specs.map(group => ({ ...group, ideal: (major - gap * (group.indices.length - 1)) / group.sum }));
    const total = groups.reduce((sum, group) => sum + group.ideal, 0);
    const available = minor - gap * (groups.length - 1);
    if (available <= 0) continue;
    const frames: PhotoFrame[] = new Array(n); let v = 0;
    for (const group of groups) {
      const thickness = available * group.ideal / total;
      let u = 0;
      group.indices.forEach((index, i) => {
        const length = (major - gap * (group.indices.length - 1)) * group.weights[i] / group.sum;
        frames[index] = columns ? { x: v, y: u, width: thickness, height: length } : { x: u, y: v, width: length, height: thickness };
        u += length + gap;
      });
      v += thickness + gap;
    }
    const losses = frames.map((frame, i) => Math.abs(Math.log((frame.width / frame.height) / aspects[i])));
    let score = losses.reduce((a, b) => a + b, 0) / n + Math.max(...losses) * .25;
    score += frames.reduce((sum, frame) => sum + Math.max(0, 85 - Math.min(frame.width, frame.height)) / 85, 0);
    const areas = frames.map(frame => frame.width * frame.height);
    // A premium gallery must not make three photos into tiny afterthoughts
    // beside one oversized image merely to improve aspect-ratio matching.
    score += Math.max(0, Math.log(Math.max(...areas) / Math.min(...areas) / (n <= 4 ? 4 : 6))) * .5;
    // Prefer a large feature plus supporting images, and fewer, calmer groups.
    score += groups.length * .008 + (order === original ? 0 : .002);
    // Among compatible patterns, give photos useful page area instead of
    // collapsing a mixed gallery into a short strip of small thumbnails.
    score += .3 * (1 - height / maxHeight);
    if (n === 3 && Math.max(...areas) / Math.min(...areas) < 1.5) score += .12;
    if (score < bestScore) { bestScore = score; best = { width, height, frames }; }
  }
  return best!;
}

/** Self-contained DOM phases also executed by the isolated PDF browser. */
export function measurePhotoGrids(root: ParentNode = document): GalleryMeasurement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.brochure-photo-grid')).map(grid => {
    const images = Array.from(grid.querySelectorAll<HTMLImageElement>('img[data-photo-mode]'));
    const paper = grid.closest<HTMLElement>('.brochure-paper')!;
    const inner = grid.parentElement!, last = inner.lastElementChild as HTMLElement;
    const footer = paper.querySelector<HTMLElement>('.brochure-page-footer')!;
    const used = last.offsetTop + last.offsetHeight + parseFloat(getComputedStyle(inner).paddingBottom) + footer.offsetHeight - grid.offsetHeight;
    return { width: grid.clientWidth, height: Math.max(140, 1056 - used), ratios: images.map(img => img.naturalWidth / img.naturalHeight || Number(img.dataset.photoRatio) || 1.5) };
  });
}
export function applyGalleryLayouts(plans: GalleryPlan[], root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.brochure-photo-grid').forEach((grid, index) => {
    const plan = plans[index]; grid.classList.add('photo-layout-ready'); grid.style.height = `${plan.height}px`;
    grid.querySelectorAll<HTMLImageElement>('img[data-photo-mode]').forEach((image, i) => {
      const frame = plan.frames[i];
      Object.assign(image.style, { left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.width}px`, height: `${frame.height}px` });
    });
  });
}
export function measureBrochureSheets(root: ParentNode = document) {
  return Array.from(root.querySelectorAll<HTMLElement>('.brochure-page-sheet')).map(sheet => {
    const paper = sheet.querySelector<HTMLElement>('.brochure-paper')!;
    const height = Math.max(paper.scrollHeight, paper.offsetHeight);
    return { height, scale: Math.min(1, 1056 / height), width: paper.scrollWidth };
  });
}
export function compactBrochureSheets(results: { scale: number }[], root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.brochure-paper').forEach((paper, i) => { paper.classList.toggle('pdf-tight-page', results[i].scale < .8); });
}
export function applyBrochureSheetFits(results: { scale: number }[], root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.brochure-page-sheet').forEach((sheet, i) => {
    const canvas = sheet.firstElementChild as HTMLElement, scale = results[i].scale;
    Object.assign(canvas.style, { position: 'absolute', left: `${(816 - 816 * scale) / (2 * scale)}px`, top: '0', zoom: String(scale) });
    const paper = canvas.querySelector<HTMLElement>('.brochure-paper')!;
    if (paper.classList.contains('brochure-page-1')) sheet.style.background = getComputedStyle(paper.querySelector('.brochure-cover-content')!).backgroundColor;
    sheet.dataset.layoutReady = 'true';
  });
}

export function refreshPhotoGrids(root: ParentNode = document) {
  const measurements = measurePhotoGrids(root);
  // The export serializer intentionally mounts hidden, unmeasurable artwork.
  // Its real frames are calculated later inside the fixed-size PDF browser.
  if (measurements.some(measurement => measurement.width <= 0)) return;
  applyGalleryLayouts(measurements.map(galleryLayout), root);
}
