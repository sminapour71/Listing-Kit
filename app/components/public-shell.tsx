import {currentAgent} from '../lib/server/auth';
import {publicNavigation} from '../lib/public-navigation';
import PublicHeader from './public-header';
import Wordmark from './wordmark';
export default async function PublicShell({children, cinematicHero=false}:{children:React.ReactNode;cinematicHero?:boolean}){
 // Navigation adapts to a verified session; public content never requires one.
 const agent=await currentAgent().catch(()=>null),signedIn=Boolean(agent);
 return <div className={cinematicHero?'public-site public-site-cinematic':'public-site'}><a className="public-skip" href="#public-content">Skip to content</a><PublicHeader signedIn={signedIn} cinematicHero={cinematicHero}/><div id="public-content" tabIndex={-1}>{children}</div><footer className="public-site-footer"><div className="public-site-footer-intro"><a href="/" aria-label="Listory home"><Wordmark/></a><p>Every listing has a story.<br/>Find the beginning of yours.</p></div><nav aria-label="Footer navigation">{publicNavigation.map(([label,href])=><a key={href} href={href}>{label==='Open Houses Today'?'Open Houses':label}</a>)}<a href="/for-agents">For Agents</a><a href={signedIn?'/workspace':'/sign-in'}>{signedIn?'Workspace':'Sign In'}</a></nav><div className="public-site-footer-note">Homes, people and a sense of place.<span>Thoughtfully presented on Listory.</span></div></footer></div>;
}
