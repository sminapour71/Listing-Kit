import {sameOrigin,readJson,PropertyError} from '../../../lib/server/properties';
import {agentRequest} from '../../../lib/server/auth';
import {ownedEvent,openHouseChecked,openHouseFailure,privateReply} from '../../../lib/server/open-houses';
export const runtime='nodejs';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{
 sameOrigin(request);const {id}=await params,{agent}=await ownedEvent(id),input=await readJson(request,1000);
 if(!input||!['open','closed'].includes(input.state))throw new PropertyError('Choose whether sign-in is open or closed.');
 await openHouseChecked(await agentRequest(agent,`listory_open_houses?id=eq.${id}&owner_id=eq.${agent.user.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:input.state})}));
 return privateReply({saved:true});
}catch(e){return openHouseFailure(e);}}
