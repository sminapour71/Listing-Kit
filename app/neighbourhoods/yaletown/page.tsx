import type {Metadata} from 'next';
import {Suspense, type ReactNode} from 'react';
import PublicShell from '../../components/public-shell';
import {PublicAgentCard, PublicOpenHouseCard, PublicPropertyCard} from '../../components/public-cards';
import {getYaletownFresh, getYaletownCurrent, getYaletownOpenHouses, getYaletownAgents} from '../../lib/server/yaletown';
import Hero from './hero';
import {yaletownMedia} from './media';
import './yaletown.css';

export const dynamic = 'force-dynamic';
const title = 'Yaletown Vancouver Neighbourhood Guide | Listory';
const description = 'Explore Yaletown’s warehouse streets, waterfront, parks and lofts in a Listory neighbourhood guide, alongside homes and public agent portfolios presented through Listory.';
export const metadata: Metadata = {title, description, openGraph: {title, description, type: 'article'}};

const chapters = [['Old Yaletown', 'old-yaletown'], ['Marinaside', 'marinaside'], ['Beach District', 'beach-district'], ['Parks & Seawall', 'parks-seawall'], ['Lofts', 'lofts']];
const history = 'https://vancouver.ca/news-calendar/downtown.aspx';
const heritage = 'https://www.heritagesitefinder.ca/area/yaletown-historic-area';
const parkDavid = 'https://app.vancouver.ca/ParkFinder/parks/16';
const parkGeorge = 'https://app.vancouver.ca/ParkFinder/parks/225';

function ChapterHeading({number, title, children}: {number: string; title: string; children: ReactNode}) {
  return <div className="yaletown-chapter-copy"><p className="yaletown-eyebrow">Chapter {number}</p><h2>{title}</h2>{children}</div>;
}
function ParkDrawing({variant}: {variant: 'garden' | 'water'}) {
  return <svg className={`yaletown-park-drawing ${variant}`} viewBox="0 0 520 320" fill="none" aria-hidden="true">
    <path d="M-20 270C100 235 110 300 260 257S420 210 550 260M-20 287C100 252 110 317 260 274S420 227 550 277"/>
    {variant === 'garden' ? <><path d="M68 245V110m0 60c-68-25-45-86 0-110 45 24 68 85 0 110M166 265V130m0 50c-65-20-40-87 0-116 40 29 65 96 0 116M408 240V104m0 55c-65-20-40-87 0-116 40 29 65 96 0 116"/><circle cx="290" cy="140" r="55"/><path d="M290 195v60M222 244h142"/></> : <><path d="M75 244h370M100 244l45-125h230l45 125M145 119l52 125m178-125-52 125M145 119l115-60 115 60M260 59v185M176 161h168M160 203h200"/><path d="M30 80c40-15 70-15 110 0M375 53c40-15 70-15 110 0"/></>}
  </svg>;
}
function DataSection({id, title, eyebrow, result, empty, children, link}: {id: string; title: string; eyebrow: string; result: PromiseSettledResult<unknown[]>; empty: string; children: ReactNode; link: {href: string; label: string}}) {
  return <section className="yaletown-data-section" id={id} aria-labelledby={`${id}-title`}><div className="yaletown-data-heading"><div><p className="yaletown-eyebrow">{eyebrow}</p><h2 id={`${id}-title`}>{title}</h2></div><a className="public-text-link" href={link.href}>{link.label} ↗</a></div>{result.status === 'rejected' ? <p className="yaletown-data-empty" role="alert">This collection is temporarily unavailable. Please try again shortly.</p> : result.value.length ? children : <div className="yaletown-data-empty"><p>{empty}</p><span>There is always more of the neighbourhood to explore.</span></div>}</section>;
}

export default function YaletownGuide() {
  return <PublicShell cinematicHero><main className="yaletown-guide">
    <Hero {...yaletownMedia}/>
    <div className="yaletown-paper">
      <section className="yaletown-intro" id="yaletown-introduction" aria-labelledby="yaletown-intro-title">
        <p className="yaletown-eyebrow">Yaletown · Vancouver</p>
        <div className="yaletown-intro-grid"><h2 id="yaletown-intro-title">Where Vancouver’s<br/>industrial past meets<br/><em>the waterfront.</em></h2><div><p>Brick and glass. Loading docks and sailboats. Yaletown is a neighbourhood of different eras, close enough to encounter on the same walk.</p><p>Historic warehouses hold restaurants, patios and converted lofts. Beyond them, contemporary residential towers look toward False Creek. The seawall draws the day outside, past parks, marina life and the changing light on the water.</p><p>Start in the old streets. Leave a little room to wander.</p></div></div>
        <nav className="yaletown-chapter-nav" aria-label="Explore Yaletown chapters">{chapters.map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
      </section>

      <section className="yaletown-chapter yaletown-old" id="old-yaletown" aria-label="Old Yaletown">
        <figure className="yaletown-photo"><img src="/media/yaletown/old-yaletown.webp" alt="Brick warehouse streets with patios and modern towers beyond, from the supplied Yaletown film" width="1280" height="720" loading="lazy"/><figcaption>The warehouse streets · A frame from the Listory film</figcaption></figure>
        <ChapterHeading number="01" title="Old Yaletown"><p className="yaletown-deck">The old city, still in the details.</p><p>Along Mainland and Hamilton, the scale becomes more intimate. Brick façades, substantial windows and the rhythm of former loading docks give these streets their industrial character.</p><p>Warehouse buildings have found new uses: lofts above, restaurants and patios below. The architecture remains part of daily life, rather than a backdrop to it.</p><a href={heritage} className="yaletown-source-link">Explore the historic area ↗</a></ChapterHeading>
      </section>

      <section className="yaletown-chapter yaletown-marinaside" id="marinaside" aria-label="Marinaside">
        <ChapterHeading number="02" title="Marinaside"><p className="yaletown-deck">A different pace, at the water’s edge.</p><p>Marinaside Crescent brings Yaletown to False Creek. Waterfront towers rise behind the promenade; boats and their masts give the view a smaller, shifting scale.</p><p>Follow the seawall toward David Lam Park. The appeal is in the continuity: a walk beside the marina, a pause by the water, then a return to the neighbourhood’s streets.</p></ChapterHeading>
        <figure className="yaletown-photo"><img src="/media/yaletown/poster.webp" alt="Boats on False Creek with the waterfront park and seawall in the foreground" width="1280" height="720" loading="lazy"/><figcaption>False Creek · Between the city and the water</figcaption></figure>
      </section>

      <section className="yaletown-parks" id="parks-seawall" aria-labelledby="yaletown-parks-title"><div className="yaletown-parks-heading"><p className="yaletown-eyebrow">Chapter 03</p><h2 id="yaletown-parks-title">The parks.<br/><em>The pause in between.</em></h2><p>Two places to slow the walk down, connected by the False Creek waterfront.</p></div>
        <div className="yaletown-park-pair"><article><div className="yaletown-park-art"><ParkDrawing variant="garden"/><span>01 / Room to breathe</span></div><p className="yaletown-eyebrow">1300 Pacific Boulevard</p><h3>David Lam Park</h3><p>Open space with the city close by. Active recreation and quieter corners share a setting that looks out over False Creek, with the seawall along its edge.</p><a className="public-text-link" href={parkDavid}>Meet the park ↗</a></article><article><div className="yaletown-park-art"><ParkDrawing variant="water"/><span>02 / A waterfront interlude</span></div><p className="yaletown-eyebrow">450 Beach Crescent</p><h3>George Wainborn Park</h3><p>Expansive lawns, formal and informal spaces, and a water feature bring a different composition to this stretch of the waterfront. False Creek is never far from the view.</p><a className="public-text-link" href={parkGeorge}>Meet the park ↗</a></article></div>
        <p className="yaletown-art-note">Original editorial illustrations, rather than maps or depictions of park layouts.</p>
      </section>

      <section className="yaletown-chapter yaletown-beach" id="beach-district" aria-label="Beach District"><div className="yaletown-beach-type" aria-hidden="true"><span>THE WATERFRONT</span><p>A little<br/>more <em>quiet.</em></p><div/><span>BEACH CRESCENT / BEACH AVENUE</span></div><ChapterHeading number="04" title="Beach District"><p className="yaletown-deck">Let the waterfront lead.</p><p>Around Beach Crescent and Beach Avenue, modern residential towers sit close to the water and George Wainborn Park. The mood can feel quieter than the restaurant streets inland.</p><p>The seawall offers a way to keep going, toward Sunset Beach and English Bay. It is another side of Yaletown: less about a destination, more about the walk between places.</p></ChapterHeading></section>

      <section className="yaletown-lofts" id="lofts" aria-labelledby="yaletown-lofts-title"><div><p className="yaletown-eyebrow">Chapter 05 · The Lofts</p><h2 id="yaletown-lofts-title">Spaces with<br/><em>a previous life.</em></h2></div><div className="yaletown-loft-detail" aria-hidden="true"><span>BRICK</span><span>BEAM</span><span>LIGHT</span><div className="yaletown-loft-window"/></div><div className="yaletown-loft-copy"><p>Converted warehouses give Yaletown a distinctive layer of residential architecture. Industrial proportions, texture and generous windows offer a different way to inhabit the city.</p><p>Lofts and industrial-inspired homes are part of that conversation. Each building tells its own story; original construction and later reinterpretation are worth understanding on their own terms.</p><a href="/buy?location=Yaletown" className="public-text-link">Explore homes presented on Listory ↗</a></div></section>

      <section className="yaletown-facts" aria-labelledby="yaletown-facts-title"><p className="yaletown-eyebrow">A closer look</p><h2 id="yaletown-facts-title">A few things about Yaletown.</h2><dl><div><dt>A name from Yale.</dt><dd>The name follows the railway’s move of equipment and repair shops from Yale in the Fraser Canyon to Vancouver.<a href={history}>City history ↗</a></dd></div><div><dt>A working past.</dt><dd>The City planned an eight-block warehouse district in 1900. Those industrial streets remain central to Yaletown’s identity.<a href={history}>The warehouse district ↗</a></dd></div><div><dt>The docks stayed.</dt><dd>Old loading docks and their overhanging canopies are a recognized part of the area’s architectural heritage.<a href={history}>Architecture & heritage ↗</a></dd></div><div><dt>The water connects.</dt><dd>Yaletown meets the wider city along the False Creek seawall, part of Vancouver’s waterfront walking and cycling network.<a href="https://vancouver.ca/parks-recreation-culture/seawall.aspx">Explore the seawall ↗</a></dd></div></dl></section>

      <div className="yaletown-discovery">
        <div className="yaletown-discovery-intro"><p className="yaletown-eyebrow">The next chapter</p><h2>A place to call <em>your own.</em></h2><p>Homes and people presented through Listory.</p></div>
        <Suspense fallback={<p className="yaletown-data-empty">Gathering homes and local perspectives…</p>}><DiscoveryCollections/></Suspense>
      </div>
      <aside className="yaletown-reading" aria-label="Guide sources"><p>Further reading</p><a href={history}>City of Vancouver history</a><a href={heritage}>Vancouver Heritage Foundation</a><a href="https://www.destinationvancouver.com/neighbourhoods/yaletown">Destination Vancouver</a><a href={parkDavid}>David Lam Park</a><a href={parkGeorge}>George Wainborn Park</a></aside>
    </div>
  </main></PublicShell>;
}

async function DiscoveryCollections() {
  const [fresh, current, events, agents] = await Promise.allSettled([getYaletownFresh(), getYaletownCurrent(), getYaletownOpenHouses(), getYaletownAgents()]);
  return <>
        <DataSection id="yaletown-fresh" title="Fresh in Yaletown" eyebrow="Recently presented" result={fresh} empty="No fresh Yaletown homes just yet." link={{href:'/fresh?location=Yaletown',label:'Browse Fresh Listings'}}><div className="public-property-grid">{fresh.status === 'fulfilled' && fresh.value.slice(0,6).map(home => <PublicPropertyCard key={home.slug} listing={home} fresh/>)}</div></DataSection>
        <DataSection id="yaletown-current" title="Current Homes in Yaletown" eyebrow="A new beginning" result={current} empty="No current Yaletown homes just yet." link={{href:'/buy?location=Yaletown',label:'Explore homes'}}><div className="public-property-grid">{current.status === 'fulfilled' && current.value.slice(0,6).map(home => <PublicPropertyCard key={home.slug} listing={home}/>)}</div></DataSection>
        <DataSection id="yaletown-open-houses" title="Open Houses in Yaletown" eyebrow="Today · Pacific Time" result={events} empty="No Listory open houses in Yaletown scheduled today." link={{href:'/open-houses',label:'Open Houses Today'}}><div className="public-property-grid">{events.status === 'fulfilled' && events.value.slice(0,6).map(event => <PublicOpenHouseCard key={event.id} event={event}/>)}</div></DataSection>
        <DataSection id="yaletown-agents" title="Listory Agents for Yaletown" eyebrow="Local perspectives" result={agents} empty="Yaletown agent introductions are on their way." link={{href:'/agents?q=Yaletown',label:'Meet Listory Agents'}}><div className="public-agent-grid">{agents.status === 'fulfilled' && agents.value.map(agent => <PublicAgentCard key={agent.slug} agent={agent}/>)}</div></DataSection>
  </>;
}
