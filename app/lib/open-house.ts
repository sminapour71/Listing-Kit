export const BUYER_STATUSES = {
  browsing: 'Just browsing', buying: 'Actively looking to buy', interested: 'Interested in this property',
  selling: 'Looking to sell my property', both: 'Both buying and selling',
} as const;
export const CONTACT_DISCLOSURE = 'By submitting this form, you agree that the listing agent may contact you regarding this property and related real estate services.';
export type BuyerStatus = keyof typeof BUYER_STATUSES;
export type OpenHouse = { id: string; event_date: string; start_time: string; end_time: string; time_zone: string; notes: string; state: 'open'|'closed'; url: string; attendeeCount: number };
export type OpenHouseAttendee = {id:string;first_name:string;last_name:string;email:string;phone:string;working_with_realtor:boolean;buyer_status:BuyerStatus;notes:string;created_at:string};
export const isEventId=(id:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
export function eventDate(date:string){return new Intl.DateTimeFormat('en-CA',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));}
export function eventTime(time:string){const [h,m]=time.split(':');return `${Number(h)%12||12}:${m} ${Number(h)<12?'AM':'PM'}`;}
export function attendeeTime(date:string){return new Intl.DateTimeFormat('en-CA',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Vancouver',timeZoneName:'short'}).format(new Date(date));}
export class OpenHouseValidationError extends Error {}
function record(input:unknown){if(!input||typeof input!=='object'||Array.isArray(input))throw new OpenHouseValidationError('Please check the form and try again.');return input as Record<string,unknown>;}
function text(data:Record<string,unknown>,key:string,label:string,max:number,required=true){const v=data[key]??'';if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new OpenHouseValidationError(`Please check ${label}.`);return v.trim();}
export function validateEvent(input:unknown){
  const d=record(input),date=text(d,'date','the event date',10),start=text(d,'startTime','the start time',5),end=text(d,'endTime','the end time',5),notes=text(d,'notes','the event notes',2000,false);
  const parsed=new Date(date+'T00:00:00Z');
  if(!/^20\d\d-\d\d-\d\d$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw new OpenHouseValidationError('Choose a valid event date between 2000 and 2099.');
  if(![start,end].every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||end<=start)throw new OpenHouseValidationError('The end time must be after the start time on the same day.');
  return {event_date:date,start_time:start,end_time:end,notes};
}
export function validateAttendee(input:unknown){
  const d=record(input);
  if(d.consent!==true)throw new OpenHouseValidationError('Please read and agree to the contact disclosure before signing in.');
  if(d.website!==undefined&&d.website!=='')throw new OpenHouseValidationError('We couldn’t accept this sign-in. Please try again.');
  const firstName=text(d,'firstName','your first name',100),lastName=text(d,'lastName','your last name',100),email=text(d,'email','your email address',254).toLowerCase(),phone=text(d,'phone','your phone number',40),notes=text(d,'notes','your notes',2000,false);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new OpenHouseValidationError('Enter a valid email address.');
  if(!/^[\d+().\s-]+$/.test(phone)||!/^\d{7,20}$/.test(phone.replace(/\D/g,'')))throw new OpenHouseValidationError('Enter a valid phone number, including the area code.');
  if(!['yes','no'].includes(d.workingWithRealtor as string))throw new OpenHouseValidationError('Please tell us whether you are working with a Realtor.');
  if(typeof d.buyerStatus!=='string'||!Object.hasOwn(BUYER_STATUSES,d.buyerStatus))throw new OpenHouseValidationError('Please choose what best describes you.');
  // Ownership, IDs, timestamps, consent version and rate fingerprints are never
  // accepted from a public payload. This whitelist is the entire public input.
  return {p_first_name:firstName,p_last_name:lastName,p_email:email,p_phone:phone,p_notes:notes,p_working_with_realtor:d.workingWithRealtor==='yes',p_buyer_status:d.buyerStatus as BuyerStatus,p_consent:true};
}
