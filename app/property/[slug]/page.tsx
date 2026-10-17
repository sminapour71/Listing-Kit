import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { propertyPortfolioLink } from '../../lib/server/portfolio';
import { getProperty } from '../../lib/server/properties';
import { money, number } from '../../lib/listing';
import { siteOrigin } from '../../lib/site-url';
import PropertyPhoto from '../../components/property-photo';
import Wordmark from '../../components/wordmark';
import type { CSSProperties } from 'react';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
function website(value: string) { try { const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined; } catch { return undefined; } }
function contrast(hex: string) { const rgb = hex.slice(1).match(/../g)!.map(v => { const c = parseInt(v, 16) / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .179 ? '#14251c' : '#ffffff'; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getProperty((await params).slug);
  if (!row || row.status !== 'published') return { title: 'Property page unavailable | Listory', robots: { index: false, follow: false } };
  const l = row.listing; const title = `${l.address.split(',')[0]} | Listory`;
  const description = (l.description || `${l.address}${l.price ? ` · ${money(l.price)}` : ''}`).replace(/\s+/g, ' ').slice(0, 160);
  const origin = siteOrigin();
  return { title: { absolute: title }, description, ...(origin ? { alternates: { canonical: `${origin}/property/${row.slug}` } } : {}), robots: row.sample ? { index: false, follow: false } : { index: true, follow: true }, openGraph: { title, description, type: 'website', ...(origin ? { url: `${origin}/property/${row.slug}` } : {}), images: l.photos[0] ? [{ url: l.photos[0].url, alt: l.address }] : [] } };
}
export default async function PropertyPage({ params }: Props) {
  const row = await getProperty((await params).slug);
  if (!row || row.status !== 'published') notFound();
  const l = row.listing, b = row.brand;
  const portfolio = await propertyPortfolioLink(row.slug);
  const name = `${b.firstName} ${b.lastName}`.trim();
  const phone = b.phone.replace(/[^\d+]/g, ''); const email = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(b.email) ? b.email : '';
  const mailto = email ? `mailto:${email}?subject=${encodeURIComponent(`Private showing — ${l.address}`)}` : undefined;
  const site = b.website ? website(b.website) : undefined;
  const instagram = b.instagram.replace(/^@/, ''); const instagramUrl = /^[a-z0-9._]{1,30}$/i.test(instagram) ? `https://www.instagram.com/${instagram}/` : undefined;
  const features = l.features.split(/[,;\n]+/).map(f => f.trim()).filter(Boolean);
  const details = [['Listing price', l.price ? money(l.price) : ''], ['Bedrooms', l.bedrooms], ['Bathrooms', l.bathrooms], ['Living area', l.squareFootage ? `${number(l.squareFootage)} sq ft` : ''], ['Property taxes', l.taxes ? `${money(l.taxes)} / year` : ''], ['Strata fee', l.strata ? `${money(l.strata)} / month` : ''], ['Parking', l.parking], ['Storage', l.storage]].filter(([, v]) => v);
  const style = { '--property-primary': b.primaryColour, '--property-secondary': b.secondaryColour, '--property-ink': contrast(b.primaryColour), '--property-secondary-ink': contrast(b.secondaryColour) } as CSSProperties;
  return <main className="public-property" style={style}>
    <header className="property-public-header"><span>{b.personalLogo ? <img src={b.personalLogo} alt={`${b.teamName || name} logo`} /> : b.teamName || name || b.brokerageName}</span><a href="#your-realtor">Book a Private Showing <span aria-hidden="true">↗</span></a></header>
    {row.sample && <p className="public-sample">Demonstration listing · Photos do not depict the sample address · Illustrative floor plan</p>}
    <section className="public-hero" aria-label="Property introduction">{l.photos[0] && <PropertyPhoto className="public-hero-image" photo={l.photos[0]} alt={`Property at ${l.address}`} fetchPriority="high" />}<div className="public-hero-copy"><div className="eyebrow">AN EXCEPTIONAL PLACE TO CALL HOME</div><h1>{l.address}</h1>{l.price && <p className="public-price">{money(l.price)}</p>}<div className="public-metrics">{l.bedrooms && <span><b>{number(l.bedrooms)}</b> bedrooms</span>}{l.bathrooms && <span><b>{number(l.bathrooms)}</b> bathrooms</span>}{l.squareFootage && <span><b>{number(l.squareFootage)}</b> sq ft</span>}</div></div></section>
    {l.photos.length > 1 && <section className="public-section public-gallery-section" aria-labelledby="public-gallery-title"><div className="public-section-heading"><div><div className="eyebrow">A CLOSER LOOK</div><h2 id="public-gallery-title">Consider every detail.</h2></div><span>{l.photos.length} photographs</span></div><div className="public-gallery">{l.photos.slice(1).map((photo, i) => <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" aria-label={`Open property photograph ${i + 2} full size`}><PropertyPhoto photo={photo} alt={`Property photograph ${i + 2} for ${l.address}`} loading="lazy" /></a>)}</div></section>}
    {(l.description || features.length > 0) && <section className="public-section public-story" aria-labelledby="public-story-title"><div><div className="eyebrow">THE PROPERTY</div><h2 id="public-story-title">A home.<br /><em>A possibility.</em></h2></div><div>{l.description && <p className="public-description">{l.description}</p>}{features.length > 0 && <><h3>Distinctive details</h3><ul className="public-features">{features.map((f, i) => <li key={i}><span aria-hidden="true">✓</span>{f}</li>)}</ul></>}</div></section>}
    {details.length > 0 && <section className="public-details-wrap"><div className="public-section"><div className="eyebrow">PROPERTY AT A GLANCE</div><h2>The finer details.</h2><dl className="public-details">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></section>}
    {l.floorPlan && <section className="public-section public-floor" aria-labelledby="public-floor-title"><div className="public-section-heading"><div><div className="eyebrow">ROOM TO IMAGINE</div><h2 id="public-floor-title">A sense of space.</h2></div><a href={l.floorPlan.url} target="_blank" rel="noopener noreferrer">View full-size floor plan ↗</a></div><a className="public-floor-image" href={l.floorPlan.url} target="_blank" rel="noopener noreferrer" aria-label="Open floor plan full size"><img src={l.floorPlan.url} alt={`Floor plan for ${l.address}`} loading="lazy" /></a>{l.floorPlan.pdfPages && <p>Floor plan · Page 1 of {l.floorPlan.pdfPages}</p>}</section>}
    <section className="public-realtor-wrap" id="your-realtor"><div className="public-section public-realtor"><div className="public-realtor-photo">{b.headshot && <img src={b.headshot} alt={`${name} headshot`} loading="lazy" />}</div><div className="public-realtor-copy"><div className="eyebrow">PERSONAL SERVICE. EXCEPTIONAL HOMES.</div><h2>Your next chapter<br /><em>starts here.</em></h2>{b.personalLogo && <img className="public-personal-logo" src={b.personalLogo} alt="Personal or team logo" />}<h3>{name || 'Your listing representative'}</h3>{b.title && <p>{b.title}</p>}{b.teamName && <p>{b.teamName}</p>}{b.brokerageName && <p>{b.brokerageName}</p>}<div className="public-contact-details">{phone && <a href={`tel:${phone}`}>{b.phone}</a>}{email && <a href={`mailto:${email}`}>{email}</a>}{site && <a href={site} target="_blank" rel="noopener noreferrer">{b.website}</a>}{instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer">@{instagram}</a>}</div><div className="public-contact-actions">{(mailto || phone) && <a className="public-showing" href={mailto || `tel:${phone}`}>Book a Private Showing ↗</a>}{phone && <a href={`tel:${phone}`}>Call</a>}{email && <a href={`mailto:${email}`}>Email</a>}</div>{portfolio && <p className="property-portfolio-link"><a href={portfolio.url}>More from {portfolio.name} ↗</a></p>}{b.brokerageLogo && <img className="public-brokerage-logo" src={b.brokerageLogo} alt={`${b.brokerageName} brokerage logo`} />}</div></div></section>
    <footer className="public-footer"><p>Information supplied by the listing representative. Buyers should independently verify all measurements and property details.</p><span>Presented with <Wordmark /></span></footer>
  </main>;
}
