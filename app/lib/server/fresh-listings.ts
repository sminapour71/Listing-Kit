import 'server-only';
import {checked,supabase} from './properties';
import type {ListingImage} from '../listing';
export type FreshCard={slug:string;first_published_at:string;current_until:string;address:string;price:string;bedrooms:string;bathrooms:string;squareFootage:string;photo:ListingImage|null;agent_name:string;agent_slug:string|null};
export async function getFreshListings(){
 const cards:FreshCard[]=[];
 for(let offset=0;;offset+=500){
  const r=await checked(await supabase(`/rest/v1/listory_fresh_listings?select=slug,first_published_at,current_until,address,price,bedrooms,bathrooms,squareFootage,photo,agent_name,agent_slug&order=first_published_at.desc,slug.asc&limit=500&offset=${offset}`));
  const rows:FreshCard[]=await r.json();cards.push(...rows);if(rows.length<500)break;
 }
 return cards;
}
