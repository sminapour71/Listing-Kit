import {supabase,sameOrigin,readJson,PropertyError} from '../../../lib/server/properties';
import {openHouseChecked,openHouseFailure,privateReply,publicEvent,submissionFingerprint} from '../../../lib/server/open-houses';
import {isEventId,validateAttendee} from '../../../lib/open-house';
import {propertyUrl} from '../../../lib/site-url';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 sameOrigin(request);const {id}=await params;if(!isEventId(id))throw new PropertyError('Open House not found.',404);
 const values=validateAttendee(await readJson(request,12_000));
 const event=await publicEvent(id);if(!event)throw new PropertyError('This Open House is not accepting sign-ins. Please speak with the listing agent.',404);
 // Restricted server RPC derives owner/listing/timestamps from the locked rows.
 // No public body can select a different agent or event relationship.
 await openHouseChecked(await supabase('/rest/v1/rpc/listory_submit_open_house',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,p_event_id:id,p_fingerprint:submissionFingerprint(request,id)})}));
 return privateReply({signedIn:true,propertyUrl:propertyUrl(event.property.slug)});
}catch(e){return openHouseFailure(e);}}
