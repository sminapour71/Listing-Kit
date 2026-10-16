'use client';
import { useEffect, useRef } from 'react';
import type { ListingImage } from '../lib/listing';
import { describePhoto, photoFit, photoPosition, refreshPhotoGrids, type PhotoMode } from '../lib/photo-fitting';
export default function PropertyPhoto({ photo, alt, className, mode = 'natural', loading, fetchPriority }: { photo: ListingImage; alt: string; className?: string; mode?: PhotoMode; loading?: 'lazy' | 'eager'; fetchPriority?: 'high' | 'low' | 'auto' }) {
  const ref = useRef<HTMLImageElement>(null);
  const dimensions = describePhoto(photo.width, photo.height);
  function fit() {
    const image = ref.current; if (!image?.naturalWidth || !image.naturalHeight) return;
    const actual = describePhoto(image.naturalWidth, image.naturalHeight);
    image.dataset.photoOrientation = actual.orientation!;
    image.dataset.photoRatio = String(actual.aspectRatio);
    image.setAttribute('width', String(actual.width)); image.setAttribute('height', String(actual.height));
    const grid = image.closest('.brochure-photo-grid'); if (grid) refreshPhotoGrids(grid);
    const frame = image.getBoundingClientRect();
    image.style.objectFit = photoFit(image.naturalWidth, image.naturalHeight, frame.width, frame.height, mode);
    image.style.objectPosition = photoPosition(photo.position);
  }
  useEffect(() => {
    const image = ref.current; if (!image) return;
    const observer = new ResizeObserver(fit); observer.observe(image); fit();
    return () => observer.disconnect();
  }, [photo.url, photo.position, mode]);
  return <img ref={ref} src={photo.url} alt={alt} className={className} loading={loading} fetchPriority={fetchPriority} width={dimensions.width} height={dimensions.height} data-photo-mode={mode} data-photo-position={photoPosition(photo.position)} data-photo-orientation={dimensions.orientation} data-photo-ratio={dimensions.aspectRatio} style={{ objectFit: 'contain', objectPosition: photoPosition(photo.position) }} onLoad={fit} />;
}
