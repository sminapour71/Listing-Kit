import { checked, productionOrigin, propertyFailure, readJson, sameOrigin, slugify, makeToken, OWNED_PROPERTY_FIELDS } from '../../lib/server/properties';
import { requireAgent, agentRequest } from '../../lib/server/auth';
import { emptyListing } from '../../lib/listing';
export const runtime='nodejs';
export async function GET(){try{const agent=await requireAgent();const response=await checked(await agentRequest(agent,`listory_properties?owner_id=eq.${agent.user.id}&select=${OWNED_PROPERTY_FIELDS}&order=updated_at.desc&limit=100`));return Response.json({properties:await response.json()},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return propertyFailure(e)}}
export async function POST(request:Request){
 try{
  sameOrigin(request);const agent=await requireAgent(),origin=productionOrigin(request),input=await readJson(request,3000);
  if(typeof input.address!=='string'||!input.address.trim()||input.address.length>500)return Response.json({error:'Enter a property address before publishing.'},{status:400});
  const base=slugify(input.address);
  for(let attempt=0;attempt<8;attempt++){
   const slug=base+(attempt?`-${makeToken().slice(0,6)}`:'');
   const response=await agentRequest(agent,'listory_properties',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,status:'draft',listing:{...emptyListing,address:input.address.trim()},brand:{},sample:input.sample===true,owner_id:agent.user.id})});
   if(response.status===409)continue;
   await checked(response);return Response.json({slug,url:`${origin}/property/${slug}`,status:'draft'},{status:201,headers:{'Cache-Control':'private, no-store'}});
  }
  return Response.json({error:'Please try publishing again to create a unique property address.'},{status:409});
 }catch(e){return propertyFailure(e)}
}
