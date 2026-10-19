import type {Metadata} from 'next';
import type {CSSProperties} from 'react';
import Wordmark from '../../components/wordmark';
import PublicShell from '../../components/public-shell';
import PropertyPhoto from '../../components/property-photo';
import OpenHouseSignIn from '../../components/open-house-sign-in';
import {publicEvent} from '../../lib/server/open-houses';
import {eventDate,eventTime} from '../../lib/open-house';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Open House Sign-In | Listory',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function OpenHousePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,event=await publicEvent(id);
 if(!event)return <PublicShell><main className="oh-public oh-unavailable"><a href="/" aria-label="Listory home"><Wordmark/></a><section><div className="eyebrow">OPEN HOUSE</div><h1>Sign-in is unavailable.</h1><p>This event is closed or its property page is no longer published. Please speak with the listing agent.</p></section></main></PublicShell>;
 const {listing,brand,sample}=event.property,name=`${brand.firstName} ${brand.lastName}`.trim();
 const primary=/^#[a-f0-9]{6}$/i.test(brand.primaryColour)?brand.primaryColour:'#244b3d',secondary=/^#[a-f0-9]{6}$/i.test(brand.secondaryColour)?brand.secondaryColour:'#eaece2';
 const rgb=primary.slice(1).match(/../g)!.map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4),ink=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#14251c':'#ffffff';
 return <PublicShell><main className="oh-public" style={{'--oh-primary':primary,'--oh-secondary':secondary,'--oh-primary-ink':ink} as CSSProperties}><header className="oh-public-header"><a href="/" aria-label="Listory home"><Wordmark/></a><span>OPEN HOUSE SIGN-IN</span></header><div className="oh-public-layout"><section className="oh-property-intro">{listing.photos[0]&&<div className="oh-property-hero"><PropertyPhoto photo={listing.photos[0]} alt={`Property at ${listing.address}`} mode="cover" fetchPriority="high"/></div>}<div className="oh-property-details"><div className="eyebrow">A NEW PLACE. A NEW POSSIBILITY.</div><h1>{listing.address}</h1><p className="oh-public-date">{eventDate(event.event_date)}<br/>{eventTime(event.start_time)} – {eventTime(event.end_time)} · Pacific Time</p>{sample&&<p className="oh-muted">Demonstration property · Photos do not depict this address.</p>}<div className="oh-public-agent">{brand.headshot&&<img className="oh-agent-headshot" src={brand.headshot} alt={`${name} headshot`}/>}<div><strong>{name||'Your listing agent'}</strong>{brand.title&&<span>{brand.title}</span>}{brand.teamName&&<span>{brand.teamName}</span>}{brand.brokerageName&&<span>{brand.brokerageName}</span>}</div></div>{(brand.personalLogo||brand.brokerageLogo)&&<div className="oh-agent-logos">{brand.personalLogo&&<img src={brand.personalLogo} alt="Personal or team logo"/>}{brand.brokerageLogo&&<img src={brand.brokerageLogo} alt="Brokerage logo"/>}</div>}</div></section><OpenHouseSignIn id={id}/></div><footer className="oh-public-footer">A considered welcome, presented with <a href="/" aria-label="Listory home"><Wordmark/></a></footer></main></PublicShell>;
}
