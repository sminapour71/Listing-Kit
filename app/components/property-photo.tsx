'use client';
import { useEffect, useRef } from 'react';
import { refreshPhotoGrids } from '../lib/brochure-layout';
import type { ListingImage } from '../lib/listing';
import { describePhoto, focalPosition, photoFit, photoPosition, type PhotoMode } from '../lib/photo-fitting';
export default function PropertyPhoto({ photo, alt, className, mode = 'natural', loading, fetchPriority }: { photo: ListingImage; alt: string; className?: string; mode?: PhotoMode; loading?: 'lazy' | 'eager'; fetchPriority?: 'high' | 'low' | 'auto' }) {
  const ref = useRef<HTMLImageElement>(null);
  const dimensions = describePhoto(photo.width, photo.height);
  function fit() {
    const image = ref.current; if (!image?.naturalWidth || !image.naturalHeight) return;
    const actual = describePhoto(image.naturalWidth, image.naturalHeight);
    image.dataset.photoOrientation = actual.orientation!;
    image.dataset.photoRatio = String(actual.aspectRatio);
    image.setAttribute('width', String(actual.width)); image.setAttribute('height', String(actual.height));
    const paper = image.closest('.brochure-paper'); if (paper) refreshPhotoGrids(paper);
    // Computed dimensions keep subpixel precision without the preview's outer scale.
    const computed = getComputedStyle(image);
    const frame = { width: parseFloat(computed.width), height: parseFloat(computed.height) };
    const fit = photoFit(image.naturalWidth, image.naturalHeight, frame.width, frame.height, mode);
    image.style.objectFit = fit;
    image.style.objectPosition = focalPosition(photo, image.naturalWidth, image.naturalHeight, frame.width, frame.height, fit);
  }
  useEffect(() => {
    const image = ref.current; if (!image) return;
    const observer = new ResizeObserver(fit); observer.observe(image); fit();
    return () => observer.disconnect();
  }, [photo.url, photo.position, photo.focalX, photo.focalY, mode]);
  return <img ref={ref} src={photo.url} alt={alt} className={className} loading={loading} fetchPriority={fetchPriority} width={dimensions.width} height={dimensions.height} data-photo-focal-x={photo.focalX} data-photo-focal-y={photo.focalY} data-photo-mode={mode} data-photo-position={photoPosition(photo.position)} data-photo-orientation={dimensions.orientation} data-photo-ratio={dimensions.aspectRatio} style={{ objectFit: mode === 'cover' ? 'cover' : 'contain', objectPosition: photoPosition(photo.position) }} onLoad={fit} />;
}
