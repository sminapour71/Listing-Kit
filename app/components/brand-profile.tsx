'use client';
import { useState, type CSSProperties } from 'react';
import { UserRound, ImagePlus, Palette, Check, Save, ArrowUpRight, Mail, Phone, Globe, Instagram, ImageIcon, X, LoaderCircle } from 'lucide-react';
import { type BrandProfileController, type BrandImageKey, isHexColour } from '../lib/brand-profile';

async function prepareImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Please choose a JPG, PNG, or WEBP image.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Please choose an image smaller than 8 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; try { await image.decode(); } catch { throw new Error('This image could not be opened. Please choose a valid JPG, PNG, or WEBP.'); }
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image preview is unavailable. Please try a different browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.94);
  } finally { URL.revokeObjectURL(url); }
}
function ImageUpload({ label, value, onChange, round = false }: { label: string; value: string; onChange: (value: string) => void; round?: boolean }) {
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  return <div className="brand-upload-group"><div className="brand-upload-label">{label}</div><div className="brand-image-row"><div className={`brand-image-thumbnail ${round ? 'round' : ''}`}>{value ? <img src={value} alt={`${label} preview`} /> : round ? <UserRound size={23} /> : <ImageIcon size={23} />}</div><div className="brand-image-actions"><label className="brand-upload-button">{loading ? <LoaderCircle size={14} className="spin" /> : <ImagePlus size={14} />}{loading ? 'Preparing…' : value ? 'Replace image' : 'Upload image'}<input aria-label={label} type="file" disabled={loading} accept="image/jpeg,image/png,image/webp" onChange={async e => {
    const input = e.currentTarget; const file = input.files?.[0]; if (!file) return;
    setError(''); setLoading(true);
    try { onChange(await prepareImage(file)); } catch (e) { setError(e instanceof Error ? e.message : 'This image could not be opened. Please choose another image.'); }
    finally { setLoading(false); input.value = ''; }
  }} /></label><small>JPG, PNG or WEBP · Max 8 MB</small>{value && <button className="brand-remove" type="button" disabled={loading} onClick={() => { onChange(''); setError(''); }} aria-label={`Remove ${label.toLowerCase()}`}><X size={12} /> Remove</button>}</div></div>{error && <p className="brand-error" role="alert">{error}</p>}</div>;
}
export default function BrandProfilePage({ controller }: { controller: BrandProfileController }) {
  const { profile: p, update, ready, dirty, save, message, error } = controller;
  const name = `${p.firstName} ${p.lastName}`.trim() || 'Your name';
  const primary = isHexColour(p.primaryColour) ? p.primaryColour : '#244B3D';
  const secondary = isHexColour(p.secondaryColour) ? p.secondaryColour : '#EAECE2';
  const textFields = [
    ['firstName', 'First name', 'e.g. Jamie', 'text', 'given-name'], ['lastName', 'Last name', 'e.g. Davis', 'text', 'family-name'],
    ['title', 'Realtor title', 'e.g. Personal Real Estate Corporation', 'text', 'organization-title'], ['teamName', 'Team name', 'e.g. The Davis Group', 'text', 'off'],
    ['brokerageName', 'Brokerage name', 'e.g. West Coast Realty', 'text', 'organization'], ['phone', 'Phone number', 'e.g. (604) 555-0123', 'tel', 'tel'],
    ['email', 'Email', 'e.g. jamie@example.com', 'email', 'email'], ['website', 'Website', 'e.g. www.jamiedavis.com', 'text', 'url'],
    ['instagram', 'Instagram handle', 'e.g. @jamiedavis', 'text', 'off'],
  ] as const;
  return <div className="brand-page"><div className="page-heading"><div><div className="eyebrow">A SIGNATURE THAT’S UNIQUELY YOURS</div><h1>Brand Profile</h1><p>Your details. Your colours. A consistent impression, everywhere.</p></div><span className="brand-save-state"><span className={dirty ? 'unsaved-dot' : 'tiny-dot'} />{!ready ? 'Loading profile…' : dirty ? 'Unsaved changes' : 'Ready to use'}</span></div>
    <form onSubmit={e => { e.preventDefault(); save(); }}><fieldset className="brand-fieldset" disabled={!ready}><div className="brand-layout"><div className="form-main"><section className="form-section"><div className="section-heading"><span>01</span><div><h2>The person behind the property</h2><p>Make every introduction feel personal.</p></div><UserRound size={20} /></div><div className="fields">{textFields.map(([key, label, placeholder, type, autoComplete]) => <label className={`field ${key === 'brokerageName' ? 'wide' : ''}`} key={key}>{label}<div className="input-wrap"><input type={type} autoComplete={autoComplete} maxLength={250} placeholder={placeholder} value={p[key]} onChange={e => update(key, e.target.value)} /></div></label>)}</div></section>
    <section className="form-section"><div className="section-heading"><span>02</span><div><h2>Put a face to your name</h2><p>The familiar details that make your brand recognisable.</p></div><ImagePlus size={20} /></div>{([['headshot', 'Headshot'], ['personalLogo', 'Personal logo'], ['brokerageLogo', 'Brokerage logo']] as [BrandImageKey, string][]).map(([key, label]) => <ImageUpload key={key} label={label} value={p[key]} round={key === 'headshot'} onChange={value => update(key, value)} />)}<p className="brand-help">Transparent PNGs work beautifully for logos. Images are resized for this prototype and stay in your browser.</p></section>
    <section className="form-section"><div className="section-heading"><span>03</span><div><h2>Your signature palette</h2><p>A little colour. A lasting impression.</p></div><Palette size={20} /></div><div className="fields">{(['primaryColour', 'secondaryColour'] as const).map((key, i) => <div key={key} className="brand-colour"><label className="field" htmlFor={`${key}-hex`}>{i === 0 ? 'Primary brand colour' : 'Secondary brand colour'}</label><div className="brand-colour-input"><input type="color" aria-label={`${i === 0 ? 'Primary' : 'Secondary'} colour picker`} value={isHexColour(p[key]) ? p[key] : '#244B3D'} onChange={e => update(key, e.target.value.toUpperCase())} /><input id={`${key}-hex`} aria-label={`${i === 0 ? 'Primary' : 'Secondary'} brand colour`} value={p[key]} maxLength={7} pattern="#[0-9a-fA-F]{6}" title="Use # followed by six letters or numbers, for example #244B3D" required onChange={e => update(key, e.target.value)} spellCheck={false} /></div></div>)}</div><p className="brand-help">Pick a colour or enter its six-digit colour code, such as #244B3D.</p></section></div>
    <aside className="brand-preview-aside"><div className="eyebrow">YOUR BRAND, AT A GLANCE</div><div className="brand-preview" style={{ '--brand-primary': primary, '--brand-secondary': secondary } as CSSProperties}><div className="brand-preview-banner" /><div className="brand-preview-body"><div className="brand-preview-headshot">{p.headshot ? <img src={p.headshot} alt="Brand preview headshot" /> : <UserRound size={30} />}</div>{p.personalLogo && <img className="brand-preview-logo" src={p.personalLogo} alt="Brand preview personal logo" />}<h2>{name}</h2><p className="brand-preview-title">{p.title || 'Your realtor title'}</p>{p.teamName && <p className="brand-preview-team">{p.teamName}</p>}<div className="brand-preview-rule" /><div className="brand-preview-contact">{[[Phone, p.phone], [Mail, p.email], [Globe, p.website], [Instagram, p.instagram]].map(([Icon, value], i) => typeof value === 'string' && value ? <div key={i}>{typeof Icon !== 'string' && <Icon size={13} />}<span>{value}</span></div> : null)}</div><div className="brand-preview-brokerage">{p.brokerageLogo && <img src={p.brokerageLogo} alt="Brand preview brokerage logo" />}<span>{p.brokerageName || 'Your brokerage'}</span></div></div><div className="brand-preview-bottom"><span style={{ background: primary }} /><span style={{ background: secondary }} /><small>Your signature palette</small></div></div><p className="brand-preview-caption">Live brand preview · Updates as you type</p><div className="brand-future"><ArrowUpRight size={18} /><h3>One profile. Every touchpoint.</h3><p>Your saved profile will be ready for future brochures, property webpages, QR pages, and open-house materials.</p><span>MARKETING TEMPLATES · COMING LATER</span></div></aside></div>
    <div className="form-footer brand-footer"><p>Saved on this browser and device only.<br /><span>Clearing browser data removes your profile. It won’t sync to other devices.</span></p><button type="submit" className="primary" disabled={!ready}><Save size={16} /> Save Brand Profile</button></div></fieldset>{error && <div className="brand-error brand-feedback" role="alert">{error}</div>}{message && <div className="notice" role="status"><Check size={20} /><div><strong>Looking like you.</strong><p>{message}</p></div></div>}</form></div>;
}
