import {ownedProperty,propertyFailure,readJson,sameOrigin,checked,PropertyError} from '../../../../lib/server/properties';
import {agentRequest} from '../../../../lib/server/auth';
import {brochureSettings} from '../../../../lib/brochure-studio';
export const runtime='nodejs';
export async function PUT(request:Request,context:{params:Promise<{slug:string}>}) {
 try {
  sameOrigin(request);const {slug}=await context.params;const row=await ownedProperty(request,slug);
  const input=await readJson(request,10000);
  if(!row.updated_at)throw new PropertyError('Refresh this listing before saving brochure choices.',409);
  // Compare-and-set prevents a concurrent publish/edit from being overwritten by
  // the JSON snapshot read above. Existing owner JWT and RLS still authorize it.
  const response=await checked(await agentRequest(row.agent,`listory_properties?slug=eq.${slug}&owner_id=eq.${row.agent.user.id}&updated_at=eq.${encodeURIComponent(row.updated_at)}&select=slug`,{
   method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},
   body:JSON.stringify({listing:{...row.listing,brochure:brochureSettings(input)},updated_at:new Date().toISOString()}),
  }));
  if(!(await response.json()).length)throw new PropertyError('This listing changed while saving. Refresh it and try again.',409);
  return Response.json({saved:true},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return propertyFailure(error);}
}
