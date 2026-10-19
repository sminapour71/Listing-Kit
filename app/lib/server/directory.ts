import 'server-only';
import {supabase,PropertyError} from './properties';
import {validAgentSlug,portfolioUrl} from '../portfolio';
import type {DirectoryAgent,DirectoryPage} from '../agents-directory';
/** Shared by public discovery and the unchanged authenticated directory API.
 * The existing service-only SQL function excludes inactive/private accounts.
 */
export async function getDirectoryAgents(query='',offset=0):Promise<DirectoryPage>{
 const q=query.trim();if(q.length>120||!Number.isInteger(offset)||offset<0||offset>1_000_000)throw new PropertyError('Please shorten your search or return to the first page.',400);
 const response=await supabase('/rest/v1/rpc/listory_directory_agents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_search:q,p_offset:offset,p_limit:25})});
 if(!response.ok){const code=(await response.json().catch(()=>({}))).code;if(['42883','PGRST202'].includes(code))throw new PropertyError('The Listory Agents database update needs to be installed before the directory can open.',503);throw new PropertyError('We couldn’t load Listory Agents. Please try again.',502);}
 const rows=await response.json();if(!Array.isArray(rows))throw new PropertyError('We couldn’t load Listory Agents. Please try again.',502);
 const agents:DirectoryAgent[]=rows.slice(0,24).filter(row=>typeof row.portfolio_slug==='string'&&validAgentSlug(row.portfolio_slug)&&typeof row.full_name==='string'&&row.full_name.trim()).map(row=>({slug:row.portfolio_slug,name:row.full_name.slice(0,501),team:typeof row.team_name==='string'?row.team_name.slice(0,250):'',brokerage:typeof row.brokerage_name==='string'?row.brokerage_name.slice(0,250):'',headshot:row.has_headshot===true?`/agent/${row.portfolio_slug}/assets/headshot`:'',url:portfolioUrl(row.portfolio_slug)}));
 return {agents,nextOffset:rows.length>24&&offset+24<=1_000_000?offset+24:null};
}
