export type PhotoPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';
export type PhotoMode = 'natural' | 'feature' | 'secondary' | 'cover';
export type PhotoDimensions = { width?: number; height?: number; aspectRatio?: number; orientation?: 'landscape' | 'portrait' | 'square'; position?: PhotoPosition; focalX?: number; focalY?: number };
export function describePhoto(width?: number, height?: number): PhotoDimensions {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width! <= 0 || height! <= 0 || width! > 100_000 || height! > 100_000) return {};
  const aspectRatio = width! / height!;
  return { width: Math.round(width!), height: Math.round(height!), aspectRatio, orientation: aspectRatio < .9 ? 'portrait' : aspectRatio > 1.1 ? 'landscape' : 'square' };
}
export function photoPosition(value?: string): PhotoPosition { return ['center', 'top', 'bottom', 'left', 'right'].includes(value || '') ? value as PhotoPosition : 'center'; }
/** The front cover always fills its frame. Other frames retain gentle fitting. */
export function photoFit(width: number, height: number, frameWidth: number, frameHeight: number, mode: PhotoMode = 'secondary'): 'contain' | 'cover' {
  if (mode === 'cover') return 'cover';
  if (mode === 'natural' || !width || !height || !frameWidth || !frameHeight) return 'contain';
  const source = width / height, frame = frameWidth / frameHeight;
  const retained = Math.min(source / frame, frame / source);
  return retained >= (mode === 'feature' ? .95 : .85) ? 'cover' : 'contain';
}
export type PhotoFocal = { focalX: number; focalY: number };
/** A pair is optional for legacy photos, and must be finite, normalized data. */
export function photoFocal(value: { focalX?: unknown; focalY?: unknown }): PhotoFocal | undefined {
  const { focalX, focalY } = value;
  return typeof focalX === 'number' && Number.isFinite(focalX) && focalX >= 0 && focalX <= 1 && typeof focalY === 'number' && Number.isFinite(focalY) && focalY >= 0 && focalY <= 1 ? { focalX, focalY } : undefined;
}
/** Center the important source point where possible, clamping at image edges.
 * Full-photo frames still show the whole photograph; this never changes fitting.
 */
export function focalPosition(photo: { focalX?: unknown; focalY?: unknown; position?: string }, width: number, height: number, frameWidth: number, frameHeight: number, fit: 'cover' | 'contain'): string {
  const focal = photoFocal(photo);
  if (!focal) return photoPosition(photo.position);
  if (!width || !height || !frameWidth || !frameHeight) return 'center';
  const scale = fit === 'cover' ? Math.max(frameWidth / width, frameHeight / height) : Math.min(frameWidth / width, frameHeight / height);
  function axis(point: number, image: number, frame: number) {
    const overflow = image * scale - frame;
    if (overflow <= .01) return 50;
    return Math.max(0, Math.min(1, (point * image * scale - frame / 2) / overflow)) * 100;
  }
  return `${axis(focal.focalX, width, frameWidth)}% ${axis(focal.focalY, height, frameHeight)}%`;
}
