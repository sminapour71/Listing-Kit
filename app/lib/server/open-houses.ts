import 'server-only';
import {createHmac} from 'node:crypto';
import {agentRequest,requireAgent} from './auth';
import {config,PropertyError,supabase} from './properties';
import {isEventId,OpenHouseValidationError} from '../open-house';
import {siteOrigin} from '../site-url';
import type {Listing} from '../listing';
import type {BrandProfile} from '../brand-profile';
export const EVENT_FIELDS='id,listing_slug,event_date,start_time,end_time,time_zone,notes,state,created_at';
export const ATTENDEE_FIELDS='id,first_name,last_name,email,phone,working_with_realtor,buyer_status,notes,created_at';
export const privateReply=(data:object,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function openHouseChecked(response:Response){
  if(response.ok)return response;
  const {code=''}=await response.json().catch(()=>({}));
  if(['42P01','42703','42883','PGRST202','PGRST204','PGRST205'].includes(code))throw new PropertyError('The Open House database update is not installed yet. Run the Open House migration in Supabase, then refresh.',503);
  if(code==='P0002')throw new PropertyError('This Open House is not accepting sign-ins. Please speak with the listing agent.',404);
  if(code==='P0001')throw new PropertyError('Too many sign-ins were submitted recently. Please wait a few minutes or speak with the agent.',429);
  if(['23514','22023','23502'].includes(code))throw new PropertyError('Please check the form details and contact disclosure, then try again.',400);
  // Never log attendee payloads, names, email addresses, phone numbers or tokens.
  console.error('Open House request failed',{status:response.status,code});
  throw new PropertyError('We couldn’t complete this Open House request. Please try again.',502);
}
export function openHouseFailure(error:unknown){
  if(error instanceof PropertyError||error instanceof OpenHouseValidationError)return privateReply({error:error.message},error instanceof PropertyError?error.status:400);
  console.error('Open House operation failed',{type:error instanceof Error?error.name:'Unknown'});
  return privateReply({error:'We couldn’t complete this request. Your form is still here; please try again.'},500);
}
export function eventUrl(id:string){if(!isEventId(id))throw new PropertyError('Open House not found.',404);return `${siteOrigin()}/open-house/${id}`;}
export async function ownedEvent(id:string){
  const agent=await requireAgent();if(!isEventId(id))throw new PropertyError('Open House not found in this account.',404);
  const result=await openHouseChecked(await agentRequest(agent,`listory_open_houses?id=eq.${id}&owner_id=eq.${agent.user.id}&select=${EVENT_FIELDS}`));const [event]=await result.json();
  if(!event)throw new PropertyError('Open House not found in this account.',404);
  return {agent,event};
}
export type PublicOpenHouse={id:string;event_date:string;start_time:string;end_time:string;time_zone:string;property:{slug:string;status:string;listing:Listing;brand:BrandProfile;sample:boolean}};
export async function publicEvent(id:string):Promise<PublicOpenHouse|null>{
  if(!isEventId(id))return null;
  // Deliberately exclude event notes, owner/account IDs, attendee counts and all
  // attendee records. Only already-published property/brand artwork is public.
  const response=await openHouseChecked(await supabase(`/rest/v1/listory_open_houses?id=eq.${id}&state=eq.open&select=id,event_date,start_time,end_time,time_zone,property:listory_properties!inner(slug,status,listing,brand,sample)&property.status=eq.published`));
  const [event]=await response.json();return event||null;
}
export function submissionFingerprint(request:Request,id:string){
  // Vercel supplies the forwarding header. This is abuse throttling only,
  // never an authentication or ownership decision. Raw IPs are not stored.
  const ip=(request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,100);
  return createHmac('sha256',config().key).update(id+'|'+ip).digest('hex');
}
