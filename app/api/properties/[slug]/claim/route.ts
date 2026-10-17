import { requireAgent, agentRequest } from '../../../../lib/server/auth';
import { propertyFailure, readJson, sameOrigin, PropertyError, productionOrigin } from '../../../../lib/server/properties';
export const runtime='nodejs';
export async function POST(request:Request,context:{params:Promise<{slug:string}>}){
 try{
  sameOrigin(request);const agent=await requireAgent(),{slug}=await context.params,input=await readJson(request,1000);
  if(!/^[a-z0-9-]{1,110}$/.test(slug)||typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token))throw new PropertyError('This browser does not have a valid original key for that listing.',403);
  const response=await agentRequest(agent,'rpc/listory_claim_legacy_property',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_slug:slug,p_token:input.token})});
  if(!response.ok){if(response.status===404)throw new PropertyError('Please run the account migration in Supabase first.',503);throw new PropertyError('This listing could not be connected. It may already belong to another account, or its original key is unavailable.',403);}
  return Response.json({slug,url:`${productionOrigin(request)}/property/${slug}`,claimed:true},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return propertyFailure(e)}
}
