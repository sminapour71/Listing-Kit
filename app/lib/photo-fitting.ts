export type PhotoPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';
export type PhotoMode = 'natural' | 'feature' | 'secondary';
export type PhotoDimensions = { width?: number; height?: number; aspectRatio?: number; orientation?: 'landscape' | 'portrait' | 'square'; position?: PhotoPosition };
export function describePhoto(width?: number, height?: number): PhotoDimensions {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width! <= 0 || height! <= 0 || width! > 100_000 || height! > 100_000) return {};
  const aspectRatio = width! / height!;
  return { width: Math.round(width!), height: Math.round(height!), aspectRatio, orientation: aspectRatio < .9 ? 'portrait' : aspectRatio > 1.1 ? 'landscape' : 'square' };
}
export function photoPosition(value?: string): PhotoPosition { return ['center', 'top', 'bottom', 'left', 'right'].includes(value || '') ? value as PhotoPosition : 'center'; }
/** Crop only close aspect-ratio matches: at most 5% for features, 15% for secondary photos. */
export function photoFit(width: number, height: number, frameWidth: number, frameHeight: number, mode: PhotoMode = 'secondary'): 'contain' | 'cover' {
  if (mode === 'natural' || !width || !height || !frameWidth || !frameHeight) return 'contain';
  const source = width / height, frame = frameWidth / frameHeight;
  const retained = Math.min(source / frame, frame / source);
  return retained >= (mode === 'feature' ? .95 : .85) ? 'cover' : 'contain';
}
/** Self-contained DOM helper, also evaluated in the isolated PDF browser. */
export function refreshPhotoGrids(root: ParentNode = document) {
  const grids = [...root.querySelectorAll('.brochure-photo-grid')];
  if (root instanceof Element && root.matches('.brochure-photo-grid')) grids.push(root);
  for (const grid of grids) {
    const images = [...grid.querySelectorAll<HTMLImageElement>('img[data-photo-mode]')];
    const known = images.every(img => Boolean(img.dataset.photoOrientation));
    grid.classList.toggle('photo-grid-mixed', known && [3, 4].includes(images.length) && images.filter(img => img.dataset.photoOrientation === 'portrait').length === 1);
  }
}
