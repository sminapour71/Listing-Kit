import type {Metadata} from 'next';
import PublicShell from '../components/public-shell';
import PropertyPhoto from '../components/property-photo';
import {getFreshListings} from '../lib/server/fresh-listings';
import {money,number} from '../lib/listing';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Fresh Listings | Listory',description:'Recently presented homes on Listory.'};
type Query=Record<string,string|string[]|undefined>;
const text=(q:Query,k:string)=>typeof q[k]==='string'?(q[k] as string).slice(0,150):'';
function numeric(value:string){return /^\d+(\.\d+)?$/.test(value.trim())?Number(value):null;}
export default async function FreshListings({searchParams}:{searchParams:Promise<Query>}){
 const q=await searchParams,location=text(q,'location'),beds=text(q,'beds'),min=text(q,'min'),max=text(q,'max');
 const minimum=numeric(min),maximum=numeric(max),bedrooms=numeric(beds);
 let failed=false;const all=await getFreshListings().catch(()=>{failed=true;return [];});
 const results=all.filter(l=>{
  const price=numeric(l.price||''),bed=numeric(l.bedrooms||'');
  return (!location||(l.address||'').toLowerCase().includes(location.toLowerCase()))&&(bedrooms===null||(bed!==null&&bed>=bedrooms))&&(minimum===null||(price!==null&&price>=minimum))&&(maximum===null||(price!==null&&price<=maximum));
 });
 const page=Math.max(1,Math.min(Math.ceil(results.length/24)||1,Math.floor(numeric(text(q,'page'))||1))),cards=results.slice((page-1)*24,page*24);
 function pageUrl(next:number){const params=new URLSearchParams({location,beds,min,max,page:String(next)});return '/fresh?'+params.toString();}
 return <PublicShell><div className="agent-portfolio fresh-page"><main><section className="fresh-intro"><div className="eyebrow">A NEW CHAPTER, BEAUTIFULLY PRESENTED</div><h1>Fresh Listings</h1><p>Recently presented homes on Listory.</p></section><section className="fresh-results" aria-label="Fresh homes"><form className="fresh-filters" action="/fresh"><label>Location / address<input name="location" defaultValue={location} placeholder="City or address" maxLength={150}/></label><label>Minimum bedrooms<select name="beds" defaultValue={['1','2','3','4','5'].includes(beds)?beds:''}><option value="">Any</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}+</option>)}</select></label><label>Minimum price<input type="number" name="min" min="0" step="any" defaultValue={minimum??''} placeholder="No minimum"/></label><label>Maximum price<input type="number" name="max" min="0" step="any" defaultValue={maximum??''} placeholder="No maximum"/></label><button className="primary" type="submit">Find homes</button><a href="/fresh">Clear</a></form><div className="fresh-result-heading"><p>{results.length} {results.length===1?'home':'homes'}</p><span>Newest first</span></div>{failed?<p role="alert">Fresh Listings are temporarily unavailable. Please try again shortly.</p>:cards.length?<div className="agent-property-grid">{cards.map(l=><article className="agent-property-card" key={l.slug}><a href={`/property/${l.slug}`} aria-label={`Explore ${l.address}`}><div className="agent-property-photo">{l.photo?<PropertyPhoto photo={l.photo} alt={l.address} mode="cover" loading="lazy"/>:<span>PROPERTY PHOTOGRAPHY</span>}</div><div className="agent-property-copy"><span className="promotion-label">Fresh Listing</span><p>{money(l.price||'')}</p><h2>{l.address}</h2><div>{l.bedrooms&&<span>{l.bedrooms} beds</span>}{l.bathrooms&&<span>{l.bathrooms} baths</span>}{l.squareFootage&&<span>{number(l.squareFootage)} sq ft</span>}</div><span className="agent-property-view">Explore the property ↗</span></div></a>{l.agent_name&&<p className="fresh-agent">Presented by {l.agent_slug?<a href={`/agent/${l.agent_slug}`}>{l.agent_name} ↗</a>:l.agent_name}</p>}</article>)}</div>:<div className="fresh-empty"><h2>{all.length?'No homes match your search.':'A new chapter is on its way.'}</h2><p>{all.length?'Try a different location or a wider price range.':'Check back soon for recently presented homes.'}</p></div>}{results.length>24&&<nav className="fresh-pagination" aria-label="Results pages">{page>1&&<a href={pageUrl(page-1)}>← Previous</a>}<span>Page {page} of {Math.ceil(results.length/24)}</span>{page*24<results.length&&<a href={pageUrl(page+1)}>Next →</a>}</nav>}</section></main></div></PublicShell>;
}
