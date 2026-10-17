import {requireAgent} from '../../lib/server/auth';
import {supabase,PropertyError} from '../../lib/server/properties';
import {validAgentSlug,portfolioUrl} from '../../lib/portfolio';
import type {DirectoryAgent,DirectoryPage} from '../../lib/agents-directory';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(request:Request){try{
 await requireAgent();
 const params=new URL(request.url).searchParams,q=(params.get('q')||'').trim(),offsetText=params.get('offset')||'0';
 if(q.length>120||!/^\d{1,7}$/.test(offsetText)||Number(offsetText)>1_000_000)throw new PropertyError('Please shorten your search or return to the first page.',400);
 const offset=Number(offsetText);
 // Only this verified-session endpoint can use the service-only function.
 // The SQL function joins Auth internally; its projection contains no Auth data.
 const response=await supabase('/rest/v1/rpc/listory_directory_agents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_search:q,p_offset:offset,p_limit:25})});
 if(!response.ok){const code=(await response.json().catch(()=>({}))).code;if(['42883','PGRST202'].includes(code))throw new PropertyError('The Listory Agents database update needs to be installed before the directory can open.',503);throw new PropertyError('We couldn’t load Listory Agents. Please try again.',502);}
 const rows=await response.json();if(!Array.isArray(rows))throw new PropertyError('We couldn’t load Listory Agents. Please try again.',502);
 const agents:DirectoryAgent[]=rows.slice(0,24).filter(row=>typeof row.portfolio_slug==='string'&&validAgentSlug(row.portfolio_slug)&&typeof row.full_name==='string'&&row.full_name.trim()).map(row=>({slug:row.portfolio_slug,name:row.full_name.slice(0,501),team:typeof row.team_name==='string'?row.team_name.slice(0,250):'',brokerage:typeof row.brokerage_name==='string'?row.brokerage_name.slice(0,250):'',headshot:row.has_headshot===true?`/agent/${row.portfolio_slug}/assets/headshot`:'',url:portfolioUrl(row.portfolio_slug)}));
 const data:DirectoryPage={agents,nextOffset:rows.length>24&&offset+24<=1_000_000?offset+24:null};return Response.json(data,{headers});
}catch(error){const known=error instanceof PropertyError;return Response.json({error:known?error.message:'We couldn’t load Listory Agents. Please try again.'},{status:known?error.status:500,headers});}}
