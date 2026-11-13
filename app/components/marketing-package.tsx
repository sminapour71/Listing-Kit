'use client';
import {compactFloorPlan} from '../lib/floor-plan-print';
import {hasBrandDetails} from '../lib/listing';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImageIcon, FileImage, UserRound, Sparkles } from 'lucide-react';
import { getBrochureStyles } from './brochure-paper';
import BrochurePreview from './brochure-preview';
import PublishProperty from './publish-property';
import DownloadBrochure from './download-brochure';
import type { BrandProfile } from '../lib/brand-profile';
import type { Publication } from '../lib/property-publication';
import type { Listing } from '../lib/listing';
import StudioPaper from './studio-paper';
import StudioChooser from './studio-chooser';
import {brochureSettings, type BrochureSettings} from '../lib/brochure-studio';
const originalPageNames = ['Cover', 'Property', 'Floor plan & details', 'Realtor'];
export default function MarketingPackage({ listing: l, brand: b, sample, sampleBrand, onBack, onBrand, publicationSlug, onPublication }: { listing: Listing; brand: BrandProfile; sample: boolean; sampleBrand: boolean; onBack: (settings?:BrochureSettings) => void; onBrand: () => void; publicationSlug?: string; onPublication?: (p: Publication) => void }) {
  const [settings,setSettings]=useState(()=>brochureSettings(l.brochure));
  const [saveMessage,setSaveMessage]=useState(''); const [saving,setSaving]=useState(false);
  const [savedSlug,setSavedSlug]=useState(publicationSlug);
  useEffect(()=>{setSettings(brochureSettings(l.brochure));setSavedSlug(publicationSlug);setPage(0);},[l]);
  const pageNames = settings.format==='double-sided'?['Front','Back']:settings.format==='folded'?['Outside · back / front','Inside · left / right']:originalPageNames;
  function choose(next:BrochureSettings){if(next.design!==settings.design||next.format!==settings.format||next.coverIndex!==settings.coverIndex||next.coverFocal!==settings.coverFocal)setPage(0);setSettings(next);setSaveMessage('');}
  async function saveChoices(){if(!savedSlug)return;setSaving(true);setSaveMessage('');try{const response=await fetch(`/api/properties/${savedSlug}/brochure-settings`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)});if(!response.ok)throw new Error('Your choices could not be saved. Please try again.');setSaveMessage('Brochure choices saved to this listing.');}catch(e){setSaveMessage(e instanceof Error?e.message:'Unable to save.');}finally{setSaving(false);}}
  const [qrCode, setQrCode] = useState('');
  const [page, setPage] = useState(0); const paper = useRef<HTMLElement>(null);
  const navigationFrame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(navigationFrame.current), []);
  const styles = getBrochureStyles(b);
  const additionalPhotos = l.photos.slice(1);
  const coverPhoto=l.photos[settings.coverIndex]||l.photos[0];
  function changePage(next: number) { cancelAnimationFrame(navigationFrame.current); setPage(next); navigationFrame.current = requestAnimationFrame(() => { paper.current?.focus({ preventScroll: true }); paper.current?.scrollIntoView({ behavior: 'auto', block: 'start' }); }); }
  return <div className="marketing-package" style={styles}><button className="back" onClick={()=>onBack(settings)}><ArrowLeft size={16} /> Back to Listing</button><div className="page-heading package-heading"><div><div className="eyebrow">THE SIGNATURE COLLECTION</div><h1>Marketing Package</h1><p>{l.address}</p></div><DownloadBrochure listing={l} brand={b} sample={sample} qrCode={qrCode} settings={settings} /></div>
  <div className="package-summary"><span><Sparkles size={15} /> Brochure Studio · Three designs. Three considered formats.</span><span>{sample ? 'SAMPLE LISTING' : 'YOUR LISTING'} · {sampleBrand ? 'SAMPLE BRANDING' : hasBrandDetails(b) ? 'SAVED BRAND PROFILE' : 'BRAND PROFILE NOT ADDED'}</span></div>{sampleBrand && <p className="package-brand-note">Sample realtor details are shown. <button onClick={onBrand}>Save your Brand Profile</button> to use your own branding.</p>}{sample && <p className="package-sample-note">Demonstration property and illustrative floor plan. Photos do not depict the sample address.</p>}
  {!sample&&!hasBrandDetails(b)&&<p className="package-brand-note">Add your saved Brand Profile for your own contact details and brokerage identification. <button onClick={onBrand}>Open Brand Profile</button></p>}
  {settings.format==='double-sided'&&l.floorPlan&&!compactFloorPlan(l.floorPlan)&&<p className="brochure-preview-note">This floor plan is retained in the full Letter and Folded brochures and on your property page. It is omitted from the condensed format because readable labels at print size could not be verified. Your property QR destination is unchanged.</p>}
  <StudioChooser listing={l} settings={settings} onChange={choose} onSave={savedSlug?()=>void saveChoices():undefined} saving={saving} message={saveMessage}/>
  <PublishProperty listing={{...l,brochure:settings}} brand={b} sample={sample} onQr={setQrCode} publicationSlug={publicationSlug} onPublication={p=>{setSavedSlug(p.slug);onPublication?.(p);}} />
  <div className="package-workspace"><nav className="brochure-thumbnails" aria-label="Brochure pages">{pageNames.map((label, index) => <button type="button" key={label} className={page === index ? 'chosen' : ''} aria-current={page === index ? 'page' : undefined} aria-label={`Page ${index + 1}: ${label}`} onClick={() => changePage(index)}><span className={`brochure-mini mini-${index}`} aria-hidden="true"><span className="mini-top" />{index === 0 ? <>{coverPhoto ? <img src={coverPhoto.url} alt="" /> : <ImageIcon size={15} />}<span className="mini-cover-lines" /></> : index === 1 ? <><span className="mini-lines" /><span className="mini-photo-grid">{additionalPhotos.slice(0, 2).map(photo => <img key={photo.id} src={photo.url} alt="" />)}</span><span className="mini-lines" /></> : index === 2 ? <>{l.floorPlan ? <img className="mini-plan" src={l.floorPlan.url} alt="" /> : <FileImage size={20} />}<span className="mini-lines" /></> : <>{b.headshot ? <img className="mini-headshot" src={b.headshot} alt="" /> : <UserRound size={21} />}<span className="mini-lines" /><span className="mini-cta" /></>}</span><span className="thumbnail-label"><b>0{index + 1}</b>{label}</span></button>)}</nav>
  <div className="package-canvas"><div className="brochure-view-toolbar"><span aria-live="polite">0{page + 1} <span>/ 0{pageNames.length}</span> <i /> {pageNames[page]}</span><span className="brochure-format">{settings.format==='folded'?'11 × 17 · LANDSCAPE SPREAD':settings.format==='double-sided'?'8.5 × 11 · FRONT / BACK':'8.5 × 11 · FOUR PAGES'}</span></div>
  <BrochurePreview key={`${page}:${qrCode}:${settings.format}:${settings.design}`} spread={settings.format==='folded'}>{(settings.format==='folded'?(page===0?[3,0]:[1,2]):[page]).map((n,i)=><StudioPaper key={n} listing={l} brand={b} sample={sample} page={n} settings={settings} paperRef={i===0?paper:undefined} qrCode={qrCode}/>)}</BrochurePreview><div className="brochure-controls"><button type="button" disabled={page === 0} onClick={() => changePage(page - 1)}><ArrowLeft size={16} /> Previous Page</button><span>Page {page + 1} of {pageNames.length}</span><button type="button" disabled={page === pageNames.length-1} onClick={() => changePage(page + 1)}>Next Page <ArrowRight size={16} /></button></div><p className="brochure-preview-note">{sample ? 'Sample artwork · Previewing your selected design and print format' : savedSlug ? 'Save brochure choices to return to this design later · Print PDFs at actual size' : 'This preview stays in this tab · Publish the property page to activate its QR code'}</p></div></div></div>;
}
