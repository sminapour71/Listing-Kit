'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, X, Files, BookOpen, ArrowRight, LoaderCircle, Check } from 'lucide-react';
import type { Listing } from '../lib/listing';
import type { BrandProfile } from '../lib/brand-profile';
import type { PdfFormat } from '../lib/pdf-contract';
export default function DownloadBrochure({ listing, brand, sample }: { listing: Listing; brand: BrandProfile; sample: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null); const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => () => controller.current?.abort(), []);
  function close() { controller.current?.abort(); dialog.current?.close(); }
  async function download(format: PdfFormat) {
    if (controller.current && !controller.current.signal.aborted && busy) return;
    const task = new AbortController(); controller.current = task;
    setBusy(true); setError(''); setMessage('');
    try {
      const { exportBrochure } = await import('../lib/export-brochure');
      await exportBrochure({ listing, brand, sample, format, signal: task.signal });
      dialog.current?.close(); setMessage('Your PDF is ready. Check your Downloads folder.');
    } catch (error) {
      if (!task.signal.aborted) setError(error instanceof Error ? error.message : 'We couldn’t prepare your brochure. Please try again.');
    } finally { if (controller.current === task) { setBusy(false); controller.current = null; } }
  }
  return <div className="package-download"><button className="package-pdf-button pdf-enabled" type="button" disabled={busy} onClick={() => { setError(''); setMessage(''); dialog.current?.showModal(); }}>{busy ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />}{busy ? 'Preparing brochure...' : 'Download PDF'}</button><small>Letter or folded · Print-ready PDF</small>{message && <span className="pdf-download-success" role="status"><Check size={12} />{message}</span>}
  <dialog ref={dialog} className="pdf-format-dialog" aria-labelledby="pdf-dialog-title" aria-describedby="pdf-dialog-description" onCancel={close} onClick={event => { if (event.target === dialog.current) { const r = dialog.current!.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } }}>
    <div className="pdf-dialog-heading"><div><div className="eyebrow">READY FOR YOUR NEXT SHOWING</div><h2 id="pdf-dialog-title">Make a lasting impression.</h2></div><button className="pdf-close" type="button" aria-label="Close download options" onClick={close}><X size={18} /></button></div>
    <p id="pdf-dialog-description">Choose the print format for your brochure.</p>
    {busy ? <div className="pdf-preparing" role="status" aria-live="polite"><LoaderCircle className="spin" size={28} /><strong>Preparing brochure...</strong><span>Preserving your photographs, colours, and branding.</span><button type="button" onClick={close}>Cancel</button></div> : <div className="pdf-format-options">
      <button type="button" className="pdf-format-option" onClick={() => void download('letter')}><span className="pdf-option-icon"><Files size={23} /></span><span><strong>Standard 8.5 × 11</strong><span>Four-page brochure designed for standard letter-size printing.</span><small>4 portrait pages · Ideal for email or two-sheet duplex printing</small></span><ArrowRight size={17} /></button>
      <button type="button" className="pdf-format-option" onClick={() => void download('folded')}><span className="pdf-option-icon"><BookOpen size={23} /></span><span><strong>Folded 11 × 17</strong><span>Print front and back on one 11 × 17 sheet, then fold it in half.</span><small>2 landscape spreads · Print actual size · Flip on short edge</small></span><ArrowRight size={17} /></button>
    </div>}
    {error && <div className="pdf-download-error" role="alert">{error}</div>}
    <p className="pdf-privacy-note">Only the brochure artwork is exported. It is processed temporarily to create your PDF and is not saved on our server.</p>
  </dialog></div>;
}
