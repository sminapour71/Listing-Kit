import {publicPageMetadata} from '../lib/public-metadata';
import type {Metadata} from 'next';
import PublicShell from '../components/public-shell';
import {PublicAgentCard} from '../components/public-cards';
import {getDirectoryAgents} from '../lib/server/directory';
import {queryText,type DiscoveryQuery} from '../lib/public-discovery';
export const dynamic='force-dynamic';
export const metadata:Metadata={...publicPageMetadata('/agents'),title:'Agents on Listory',description:'Meet participating Listory agents. Search by name, team, brokerage or neighbourhood.'};
export default async function PublicAgents({searchParams}:{searchParams:Promise<DiscoveryQuery>}){
 const q=await searchParams,search=queryText(q,'q',120).trim(),offsetText=queryText(q,'offset'),offset=/^\d{1,7}$/.test(offsetText)&&Number(offsetText)<=1_000_000?Number(offsetText):0;
 const result=await getDirectoryAgents(search,offset).then(data=>({data,error:false})).catch(()=>({data:{agents:[],nextOffset:null},error:true}));
 return <PublicShell><main className="public-directory"><div className="public-page-intro"><p className="public-eyebrow">THE PEOPLE BEHIND THE HOMES</p><h1>Agents on Listory</h1><p>Local perspectives. A personal approach.</p></div><form className="public-agent-search" action="/agents"><label htmlFor="public-agent-search">Find an agent</label><div><input id="public-agent-search" name="q" type="search" maxLength={120} defaultValue={search} placeholder="Name, team, brokerage or neighbourhood"/><button type="submit" className="public-button">Search agents ↗</button></div><p>Browse participating agents with published Listory portfolios.</p></form>{result.error?<p role="alert" className="public-empty">Agent discovery is temporarily unavailable. Please try again shortly.</p>:result.data.agents.length?<div className="public-agent-grid">{result.data.agents.map(a=><PublicAgentCard key={a.slug} agent={a}/>)}</div>:<div className="public-empty"><h2>No agents found.</h2><p>{search?'Try another name, team, brokerage or neighbourhood.':'Public agent portfolios will appear here when they’re ready.'}</p>{search&&<a className="public-text-link" href="/agents">Clear search ↗</a>}</div>}<nav className="public-pagination" aria-label="Agent results pages">{offset>0&&<a href={'/agents?'+new URLSearchParams({q:search,offset:String(Math.max(0,offset-24))})}>← Previous</a>}{result.data.nextOffset!==null&&<a href={'/agents?'+new URLSearchParams({q:search,offset:String(result.data.nextOffset)})}>More agents →</a>}</nav></main></PublicShell>;
}
