import {ownedProperty,readJson,sameOrigin,PropertyError} from '../../../../lib/server/properties';
import {agentRequest} from '../../../../lib/server/auth';
import {EVENT_FIELDS,eventUrl,openHouseChecked,openHouseFailure,privateReply} from '../../../../lib/server/open-houses';
import {validateEvent} from '../../../../lib/open-house';
type Context={params:Promise<{slug:string}>};
export const runtime='nodejs';
export async function GET(request:Request,{params}:Context){try{
 const {slug}=await params,{agent,status,listing}=await ownedProperty(request,slug);
 const response=await openHouseChecked(await agentRequest(agent,`listory_open_houses?listing_slug=eq.${slug}&owner_id=eq.${agent.user.id}&select=${EVENT_FIELDS},attendees:listory_open_house_attendees(count)&order=event_date.desc,start_time.desc,id.desc`));
 const events=(await response.json()).map(row=>({id:row.id,event_date:row.event_date,start_time:row.start_time,end_time:row.end_time,time_zone:row.time_zone,notes:row.notes,state:row.state,url:eventUrl(row.id),attendeeCount:row.attendees?.[0]?.count||0}));
 return privateReply({events,address:listing.address,published:status==='published'});
}catch(e){return openHouseFailure(e);}}
export async function POST(request:Request,{params}:Context){try{
 sameOrigin(request);const {slug}=await params,{agent,status}=await ownedProperty(request,slug);
 if(status!=='published')throw new PropertyError('Publish the property page before creating an Open House so visitors can view the property afterward.',409);
 const values=validateEvent(await readJson(request,8000));
 const response=await openHouseChecked(await agentRequest(agent,'listory_open_houses?select=id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({...values,listing_slug:slug,owner_id:agent.user.id})}));
 const [event]=await response.json();return privateReply({id:event.id,url:eventUrl(event.id)},201);
}catch(e){return openHouseFailure(e);}}
