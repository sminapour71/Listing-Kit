import { agentRequest, requireAgent } from '../../lib/server/auth';
import { ensureAgentProfile, validateAccountBrand } from '../../lib/server/agent-profile';
import { checked, propertyFailure, readJson, sameOrigin } from '../../lib/server/properties';
export const runtime='nodejs';
const reply=(data:object)=>Response.json(data,{headers:{'Cache-Control':'private, no-store'}});
export async function GET(){try{const agent=await requireAgent();await ensureAgentProfile(agent);const response=await checked(await agentRequest(agent,`listory_agent_profiles?id=eq.${agent.user.id}&select=id,brand`));const [row]=await response.json();return reply({id:agent.user.id,accountEmail:agent.user.email,brand:row?.brand||{}});}catch(e){return propertyFailure(e)}}
export async function PUT(request:Request){try{sameOrigin(request);const agent=await requireAgent();const input=await readJson(request,3_800_000);const brand=await validateAccountBrand(input.brand);await checked(await agentRequest(agent,'listory_agent_profiles?on_conflict=id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:agent.user.id,brand,updated_at:new Date().toISOString()})}));return reply({saved:true});}catch(e){return propertyFailure(e)}}
