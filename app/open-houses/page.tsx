import type {Metadata} from 'next';
import PublicShell from '../components/public-shell';
import {PublicOpenHouseCard} from '../components/public-cards';
import {getOpenHousesToday} from '../lib/server/public-discovery';
import {discoveryToday} from '../lib/public-discovery';
import {eventDate} from '../lib/open-house';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Open Houses Today | Listory',description:'Explore today’s open houses presented on Listory. All times are Pacific Time.'};
export default async function OpenHouses(){const now=new Date();let failed=false;const events=await getOpenHousesToday(now).catch(()=>{failed=true;return [];});return <PublicShell><main className="public-directory"><div className="public-page-intro"><p className="public-eyebrow">STEP INSIDE</p><h1>Open Houses Today</h1><p>{eventDate(discoveryToday(now))} · Pacific Time</p></div>{failed?<p className="public-empty" role="alert">Open Houses are temporarily unavailable. Please try again shortly.</p>:events.length?<div className="public-property-grid">{events.map(e=><PublicOpenHouseCard key={e.id} event={e}/>)}</div>:<div className="public-empty"><h2>A little room for possibility.</h2><p>No Listory open houses scheduled today.</p><a href="/buy" className="public-text-link">Explore homes on Listory ↗</a></div>}</main></PublicShell>;}
