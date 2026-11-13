import {socialEvents,socialProject} from '../../../lib/server/social-media';
import {sameOrigin,readJson,propertyFailure,PropertyError} from '../../../lib/server/properties';
import {isSocialKind} from '../../../lib/social-media';
type Context={params:Promise<{slug:string}>};
export const runtime='nodejs';
const reply=(data:object)=>Response.json(data,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function GET(request:Request,{params}:Context){try{return reply({events:await socialEvents(request,(await params).slug)});}catch(e){return propertyFailure(e);}}
export async function POST(request:Request,{params}:Context){try{sameOrigin(request);const input=await readJson(request,3000);if(!isSocialKind(input.kind))throw new PropertyError('Choose a social creation.');return reply(await socialProject(request,(await params).slug,input.kind,input.eventId,input.soldConfirmed));}catch(e){return propertyFailure(e);}}
