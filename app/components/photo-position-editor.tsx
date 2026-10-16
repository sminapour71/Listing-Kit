'use client';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { X } from 'lucide-react';
import type { ListingImage } from '../lib/listing';
import { focalPosition, photoFocal, type PhotoFocal } from '../lib/photo-fitting';

export default function PhotoPositionEditor({ photo, onSave, onClose }: { photo: ListingImage; onSave: (focal?: PhotoFocal) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; focal: PhotoFocal; width: number; height: number } | null>(null);
  const [focal, setFocal] = useState<PhotoFocal | undefined>(() => photoFocal(photo));
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [source, setSource] = useState({ width: photo.width || 0, height: photo.height || 0 });
  const [error, setError] = useState(false);
  useEffect(() => {
    const element = dialog.current!, preview = frame.current!;
    element.showModal(); preview.focus();
    const observer = new ResizeObserver(() => setSize({ width: preview.clientWidth, height: preview.clientHeight }));
    observer.observe(preview);
    return () => observer.disconnect();
  }, []);
  function close() { dialog.current?.close(); onClose(); }
  function bounded(x: number, y: number) { return { focalX: Math.max(0, Math.min(1, x)), focalY: Math.max(0, Math.min(1, y)) }; }
  function begin(event: PointerEvent<HTMLDivElement>) {
    if (!source.width || !size.width || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    const scale = Math.max(size.width / source.width, size.height / source.height);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, focal: focal || { focalX: .5, focalY: .5 }, width: source.width * scale, height: source.height * scale };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current; if (!start || start.id !== event.pointerId) return;
    setFocal(bounded(start.focal.focalX - (event.clientX - start.x) / start.width, start.focal.focalY - (event.clientY - start.y) / start.height));
  }
  return <dialog ref={dialog} className="pdf-format-dialog photo-position-dialog" aria-labelledby="photo-position-title" aria-describedby="photo-position-help" onCancel={event => { event.preventDefault(); close(); }} onClick={event => {
    if (event.target !== dialog.current) return;
    const r = dialog.current!.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
  }}>
    <div className="pdf-dialog-heading"><div><div className="eyebrow">THE RIGHT PERSPECTIVE</div><h2 id="photo-position-title">Adjust Position</h2></div><button className="pdf-close" type="button" aria-label="Close photo positioning" onClick={close}><X size={18} /></button></div>
    <p id="photo-position-help">Drag photo to reposition. You can also use the arrow keys.</p>
    <div ref={frame} className="photo-position-frame" tabIndex={0} role="group" aria-label="Photo position preview" aria-describedby="photo-position-help" onPointerDown={begin} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={event => {
      const direction = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
      if (!direction) return; event.preventDefault(); const current = focal || { focalX: .5, focalY: .5 }; const step = event.shiftKey ? .1 : .02;
      setFocal(bounded(current.focalX + direction[0] * step, current.focalY + direction[1] * step));
    }}>
      <img src={photo.url} alt="Property photo positioning preview" draggable={false} onLoad={event => setSource({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} onError={() => setError(true)} style={{ objectPosition: focalPosition(focal || {}, source.width, source.height, size.width, size.height, 'cover') }} />
    </div>
    <p className="photo-position-note">This cropped preview helps you choose the important part of your photo. Each layout keeps its own frame; full-photo frames still show the entire image.</p>
    <span className="photo-position-status" role="status">{focal ? 'Custom position' : 'Automatic · centred'}</span>
    {error && <p className="brand-error" role="alert">This photo couldn’t be opened. Please close this window and upload it again.</p>}
    <div className="photo-position-actions"><button type="button" className="photo-reset" onClick={() => setFocal(undefined)}>Reset Position</button><div><button type="button" className="photo-reset" onClick={close}>Cancel</button><button type="button" className="primary" disabled={error || !source.width} onClick={() => { onSave(focal); close(); }}>Save</button></div></div>
  </dialog>;
}
