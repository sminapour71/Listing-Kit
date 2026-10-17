import {agentRequest} from '../../../../lib/server/auth';
import {ATTENDEE_FIELDS,ownedEvent,openHouseChecked,openHouseFailure,privateReply} from '../../../../lib/server/open-houses';
import {PropertyError} from '../../../../lib/server/properties';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const {id}=await params,{agent}=await ownedEvent(id),raw=new URL(request.url).searchParams.get('offset')||'0';
 if(!/^\d{1,7}$/.test(raw))throw new PropertyError('Please refresh the attendee list.');
 const offset=Number(raw);
 const response=await openHouseChecked(await agentRequest(agent,`listory_open_house_attendees?open_house_id=eq.${id}&owner_id=eq.${agent.user.id}&select=${ATTENDEE_FIELDS}&order=created_at.desc,id.desc&offset=${offset}&limit=50`,{headers:{Prefer:'count=exact'}}));
 const attendees=await response.json(),total=Number(response.headers.get('content-range')?.split('/')[1]||0);
 return privateReply({attendees,total,hasMore:offset+attendees.length<total});
}catch(e){return openHouseFailure(e);}}
