import {ownedProperty,checked,propertyFailure,readJson,sameOrigin,PropertyError} from '../../../../lib/server/properties';
import {agentRequest} from '../../../../lib/server/auth';
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  sameOrigin(request);const {slug}=await params;const row=await ownedProperty(request,slug);
  const body=await readJson(request,1000);
  if(typeof body.current_until!=='string'||!Number.isFinite(Date.parse(body.current_until)))throw new PropertyError('Refresh your listings before extending.');
  const r=await agentRequest(row.agent,'rpc/listory_extend_listing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_slug:slug,p_expected_current_until:body.current_until})});
  if(!r.ok){const data=await r.clone().json().catch(()=>({}));if(data.code==='40001')throw new PropertyError('This listing has changed or is no longer Current. Refresh your listings.',409);}
  await checked(r);return Response.json({current_until:await r.json()},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return propertyFailure(e);}
}
