'use client';
import { useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, Globe, LoaderCircle } from 'lucide-react';
import QRCode from 'qrcode';
import type { Listing } from '../lib/listing';
import type { BrandProfile } from '../lib/brand-profile';
import { publicationStorageKey, type Publication } from '../lib/property-publication';

async function json(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'The property page could not be saved. Please try again.');
  return data;
}
async function imageBlob(src: string, photo: boolean) {
  const image = new Image(); image.crossOrigin = 'anonymous'; image.src = src;
  await image.decode().catch(() => { throw new Error('One of the images could not be opened. Please select it again.'); });
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, (photo ? 2400 : 1800) / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!; if (photo) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, photo ? 'image/jpeg' : 'image/png', .92));
  canvas.width = canvas.height = 0;
  if (!blob || blob.size > 3_800_000) throw new Error('One image is too large to publish. Please choose a smaller version.');
  return blob;
}
export default function PublishProperty({ listing, brand, sample, onQr }: { listing: Listing; brand: BrandProfile; sample: boolean; onQr: (qr: string) => void }) {
  const [publication, setPublication] = useState<Publication | null>(null);
  const [busy, setBusy] = useState(false); const [ready, setReady] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [qr, setQr] = useState('');
  const lock = useRef(false); const address = listing.address; const key = publicationStorageKey(address);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let alive = true; setPublication(null); setQr(''); onQr(''); setReady(false);
    (async () => {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const p = JSON.parse(saved) as Publication;
          if (!/^[a-z0-9-]{1,110}$/.test(p.slug) || !/^[a-f0-9]{64}$/.test(p.token)) throw new Error('Saved publication could not be read.');
          const result = await json(await fetch(`/api/properties/${p.slug}`, { headers: { 'x-listory-management': p.token }, cache: 'no-store' }));
          if (alive) {
            const refreshed = { ...p, status: result.status, url: result.url };
            localStorage.setItem(key, JSON.stringify(refreshed));
            setPublication(refreshed);
          }
        }
        if (alive) setReady(true);
      } catch { if (alive) setError('The saved property-page connection could not be checked. Refresh to try again. Your existing property page is unchanged.'); }
    })();
    return () => { alive = false; };
  }, [key, onQr]);
  useEffect(() => {
    let alive = true;
    if (publication?.status !== 'published') { setQr(''); onQr(''); return; }
    QRCode.toDataURL(publication.url, { width: 1024, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }).then(value => { if (alive) { setQr(value); onQr(value); } }).catch(() => { if (alive) setError('The QR code could not be prepared. Please refresh this page.'); });
    return () => { alive = false; };
  }, [publication, onQr]);
  function remember(p: Publication) {
    // Save the management capability before uploading anything. Publishing stops
    // if browser storage is unavailable, so a page cannot become unmanageable.
    try { localStorage.setItem(key, JSON.stringify(p)); }
    catch { throw new Error('Please allow browser storage before publishing, so this browser can securely manage your property page.'); }
    setPublication(p);
  }
  async function publish() {
    if (lock.current || !ready) return; lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      localStorage.setItem('listory.storage-check', 'ok'); localStorage.removeItem('listory.storage-check');
      let p = publication;
      if (!p) { const created = await json(await fetch('/api/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, sample }) })); p = created; remember(p!); }
      const owner = { 'x-listory-management': p!.token };
      const images = new Map<string, string>();
      async function upload(src: string, photo = false) {
        if (!src) return '';
        if (images.has(src)) return images.get(src)!;
        const blob = await imageBlob(src, photo);
        const result = await json(await fetch(`/api/properties/${p!.slug}/assets`, { method: 'POST', headers: { ...owner, 'Content-Type': blob.type }, body: blob }));
        images.set(src, result.url); return result.url as string;
      }
      const photos = []; for (const photo of listing.photos) photos.push({ ...photo, url: await upload(photo.url, true) });
      const floorPlan = listing.floorPlan ? { ...listing.floorPlan, url: await upload(listing.floorPlan.url) } : null;
      const publicBrand = { ...brand, headshot: await upload(brand.headshot), personalLogo: await upload(brand.personalLogo), brokerageLogo: await upload(brand.brokerageLogo) };
      const result = await json(await fetch(`/api/properties/${p!.slug}`, { method: 'PUT', headers: { ...owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ listing: { ...listing, photos, floorPlan }, brand: publicBrand }) }));
      if (active.current) { remember({ ...p!, ...result }); setMessage('Published. Your property link and brochure QR code are ready.'); }
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : 'Publishing could not finish. Your listing is still here.'); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  async function unpublish() {
    if (!publication || lock.current) return; lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await json(await fetch(`/api/properties/${publication.slug}`, { method: 'DELETE', headers: { 'x-listory-management': publication.token } })); remember({ ...publication, status: 'draft' }); setMessage('Unpublished. The link now shows that the property page is no longer available.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="property-publish" aria-label="Property page publishing"><div className="publish-copy"><div className="eyebrow">PROPERTY PAGE</div><h2>{publication?.status === 'published' ? 'A public home for your listing.' : 'Take the story beyond the brochure.'}</h2><p>Publishing makes these property details, photos, and saved Realtor contact information public.{sample && ' This sample page will be labelled as a demonstration.'}</p>{publication?.status === 'published' && <><span className="publish-status">● Published</span><a className="published-url" href={publication.url} target="_blank" rel="noopener noreferrer">{publication.url}</a><div className="publish-links"><button disabled={busy} onClick={async () => { try { await navigator.clipboard.writeText(publication.url); setMessage('Property link copied.'); } catch { setError('Select and copy the property link shown above.'); } }}><Copy size={14} /> Copy Link</button><a href={publication.url} target="_blank" rel="noopener noreferrer">View Property Page <ExternalLink size={14} /></a><button disabled={busy} onClick={() => void unpublish()}>Unpublish Property Page</button></div></>}</div>{qr && <figure className="publish-qr"><img src={qr} alt="QR code for the published property page" /><figcaption>Scan for full property details</figcaption></figure>}<div className="publish-action"><button className="primary" disabled={busy || !ready} onClick={() => void publish()}>{busy ? <LoaderCircle size={16} className="spin" /> : <Globe size={16} />}{busy ? 'Publishing property page...' : publication?.status === 'published' ? 'Update Property Page' : 'Publish Property Page'}</button><small>{publication?.status === 'published' ? 'Publish again after editing to update the webpage.' : 'A unique public link and a real brochure QR code.'}</small></div>{error && <p role="alert" className="publish-error">{error}</p>}{message && <p role="status" className="publish-message">{message}</p>}</section>;
}
