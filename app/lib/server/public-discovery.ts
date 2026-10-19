import 'server-only';
import {checked,supabase} from './properties';
import {discoveryToday,DISCOVERY_TIME_ZONE} from '../public-discovery';
import type {FreshCard} from './fresh-listings';
/** Existing property table and lifecycle timestamps; only public card fields. */
export async function getCurrentListings(){
 const cards:FreshCard[]=[];const now=new Date().toISOString();
 for(let offset=0;;offset+=500){
  const r=await checked(await supabase(`/rest/v1/listory_properties?status=eq.published&owner_id=not.is.null&current_until=gt.${now}&select=slug,first_published_at,current_until,address:listing->>address,price:listing->>price,bedrooms:listing->>bedrooms,bathrooms:listing->>bathrooms,squareFootage:listing->>squareFootage,photo:listing->photos->0,firstName:brand->>firstName,lastName:brand->>lastName&order=first_published_at.desc.nullslast,slug.asc&limit=500&offset=${offset}`));
  const rows=await r.json();cards.push(...rows.map((v:FreshCard&{firstName?:string;lastName?:string})=>({slug:v.slug,first_published_at:v.first_published_at,current_until:v.current_until,address:v.address||'',price:v.price||'',bedrooms:v.bedrooms||'',bathrooms:v.bathrooms||'',squareFootage:v.squareFootage||'',photo:v.photo||null,agent_name:[v.firstName,v.lastName].filter(Boolean).join(' '),agent_slug:null})));if(rows.length<500)break;
 }
 return cards;
}
export type OpenHouseCard={id:string;event_date:string;start_time:string;end_time:string;time_zone:string;property:{slug:string;address:string;price:string;photo:FreshCard['photo']}};
export async function getOpenHousesToday(now=new Date()){
 const cards:OpenHouseCard[]=[];const date=discoveryToday(now);
 for(let offset=0;;offset+=500){
  // No notes, owner IDs, attendee counts or attendee relation is selected.
  // Past promotion periods stay out of active discovery; sign-in URLs are unchanged.
  const r=await checked(await supabase(`/rest/v1/listory_open_houses?state=eq.open&event_date=eq.${date}&time_zone=eq.${DISCOVERY_TIME_ZONE}&select=id,event_date,start_time,end_time,time_zone,property:listory_properties!inner(slug,address:listing->>address,price:listing->>price,photo:listing->photos->0)&property.status=eq.published&property.owner_id=not.is.null&property.current_until=gt.${now.toISOString()}&order=start_time.asc,id.asc&limit=500&offset=${offset}`));
  const rows=await r.json();cards.push(...rows);if(rows.length<500)break;
 }
 return cards;
}
