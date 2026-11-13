import type {Listing,ListingImage} from './listing';
import type {BrandProfile} from './brand-profile';
import {discoveryToday,DISCOVERY_TIME_ZONE} from './public-discovery';
export const SOCIAL_ACTIONS=[
 {id:'property-reel',title:'Property Reel',description:'A cinematic introduction, ready to share.',format:'1080 × 1920 · Silent MP4'},
 {id:'carousel',title:'Instagram Carousel',description:'One story, told through a considered collection.',format:'1080 × 1350 · Numbered PNGs in a ZIP'},
 {id:'just-listed',title:'Just Listed Post',description:'Give a new address a beautiful introduction.',format:'1080 × 1350 · PNG'},
 {id:'just-sold',title:'Just Sold Post',description:'Celebrate the next chapter with restraint.',format:'1080 × 1350 · PNG'},
 {id:'open-house-story',title:'Open House Story',description:'An elegant invitation to step inside.',format:'1080 × 1920 · PNG'},
 {id:'open-house-reel',title:'Open House Reel',description:'A moving invitation, using your saved event.',format:'1080 × 1920 · Silent MP4'},
] as const;
export type SocialKind=typeof SOCIAL_ACTIONS[number]['id'];
export type SocialEvent={id:string;event_date:string;start_time:string;end_time:string;time_zone:string;state:string};
export type SocialCard={slug:string;address:string;price:string;status:string;photo:string};
export type SocialProject={kind:SocialKind;listing:Listing;brand:BrandProfile;propertyUrl:string;event:SocialEvent|null};
export type SocialSlide={role:'cover'|'photo'|'features'|'specifications'|'plan'|'contact';photo?:ListingImage;index:number};
export const isSocialKind=(value:unknown):value is SocialKind=>SOCIAL_ACTIONS.some(a=>a.id===value);
export const isSocialVideo=(kind:SocialKind)=>kind==='property-reel'||kind==='open-house-reel';
export const isSocialEvent=(kind:SocialKind)=>kind==='open-house-story'||kind==='open-house-reel';
export function upcomingSocialEvent(e:SocialEvent,now=new Date()){
 if(e.state!=='open'||e.time_zone!==DISCOVERY_TIME_ZONE||!/^\d{4}-\d{2}-\d{2}$/.test(e.event_date))return false;
 const today=discoveryToday(now),time=new Intl.DateTimeFormat('en-GB',{timeZone:DISCOVERY_TIME_ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 return e.event_date>today||(e.event_date===today&&e.end_time.slice(0,5)>time);
}
export function reelTiming(photoCount:number,short=false){const count=Math.max(1,Math.min(short?10:24,photoCount)),seconds=Math.min(short?18:45,Math.max(6,count*(short?1.6:1.9)+2));return{count,seconds,fps:24};}
export function socialFilename(address:string,kind:SocialKind){const stem=address.split(',')[0].normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,85)||'Property';return`${stem}-${SOCIAL_ACTIONS.find(a=>a.id===kind)!.title.replaceAll(' ','-')}`;}
export function socialSlides(project:SocialProject):SocialSlide[]{
 const photos=project.listing.photos.slice(0,8),slides:Omit<SocialSlide,'index'>[]=[{role:'cover',photo:photos[0]}];
 for(const photo of photos.slice(1))slides.push({role:'photo',photo});
 if(project.listing.features.trim())slides.push({role:'features',photo:photos[2]||photos[0]});
 if([project.listing.price,project.listing.bedrooms,project.listing.bathrooms,project.listing.squareFootage].some(Boolean))slides.push({role:'specifications',photo:photos[1]||photos[0]});
 const plan=project.listing.floorPlan,print=plan?.floorPlanPrint;
 // Conservative 4:5 plan region; raster/legacy/multi-page plans are never guessed legible.
 if(plan&&Number(plan.pdfPages||1)===1&&print&&print.smallestTextPt*Math.min(930/print.widthPt,800/print.heightPt)>=24)slides.push({role:'plan'});
 slides.push({role:'contact',photo:photos[0]});return slides.slice(0,12).map((s,index)=>({...s,index}));
}
