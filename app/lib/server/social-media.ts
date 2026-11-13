import 'server-only';
import {requireAgent,agentRequest} from './auth';
import {ownedProperty,checked,config,PropertyError} from './properties';
import {brochureListing,brochureSettings} from '../brochure-studio';
import {listingLifecycle} from '../listing-lifecycle';
import {upcomingSocialEvent,type SocialEvent,type SocialProject,type SocialKind} from '../social-media';
import {describePhoto,photoFocal,photoPosition} from '../photo-fitting';
import {floorPlanPrint} from '../floor-plan-print';
import {discoveryToday} from '../public-discovery';
import {siteOrigin} from '../site-url';
import type {BrandProfile} from '../brand-profile';
import type {Listing,ListingImage} from '../listing';
export function socialAsset(url:string,slug:string){
 const base=config().url+'/storage/v1/object/public/listory-published/'+slug+'/';
 if(!url.startsWith(base))throw new PropertyError('A saved photograph could not be opened. Reopen and save this listing, then try again.',409);
 const file=url.slice(base.length);if(!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(file))throw new PropertyError('A saved image could not be opened.',409);
 return `/api/properties/${slug}/assets?file=${encodeURIComponent(file)}`;
}
export async function socialCards(){const agent=await requireAgent(),r=await checked(await agentRequest(agent,`listory_properties?owner_id=eq.${agent.user.id}&select=slug,status,listing,first_published_at,current_until,publication_date_unknown&order=updated_at.desc&limit=100`));
 return(await r.json()).map(row=>{const l=brochureListing(row.listing,brochureSettings(row.listing.brochure));return{slug:row.slug,address:l.address,price:l.price,status:listingLifecycle(row),photo:l.photos[0]?socialAsset(l.photos[0].url,row.slug):''};});
}
export async function socialEvents(request:Request,slug:string){const {agent}=await ownedProperty(request,slug),r=await checked(await agentRequest(agent,`listory_open_houses?listing_slug=eq.${slug}&owner_id=eq.${agent.user.id}&state=eq.open&event_date=gte.${discoveryToday()}&time_zone=eq.America/Vancouver&select=id,event_date,start_time,end_time,time_zone,state&order=event_date.asc,start_time.asc&limit=100`));return(await r.json() as SocialEvent[]).filter(e=>upcomingSocialEvent(e));}
export async function socialProject(request:Request,slug:string,kind:SocialKind,eventId:unknown,soldConfirmed:unknown):Promise<SocialProject>{
 const row=await ownedProperty(request,slug),{agent}=row;
 if(kind==='just-sold'&&soldConfirmed!==true)throw new PropertyError('Confirm that this property has sold before creating a Just Sold post.',400);
 const source=brochureListing(row.listing,brochureSettings(row.listing.brochure));if(!source.photos.length)throw new PropertyError('Add at least one property photograph to this listing first.',409);
 const image=(p:ListingImage):ListingImage=>({id:p.id,name:p.name,url:socialAsset(p.url,slug),...describePhoto(p.width,p.height),...photoFocal(p),position:photoPosition(p.position),caption:p.caption?.slice(0,100)||'',...(floorPlanPrint(p.floorPlanPrint)?{floorPlanPrint:floorPlanPrint(p.floorPlanPrint)}:{}),...(p.pdfPages?{pdfPages:p.pdfPages}:{})});
 const listing:Listing={address:source.address,price:source.price,bedrooms:source.bedrooms,bathrooms:source.bathrooms,squareFootage:source.squareFootage,taxes:source.taxes,strata:source.strata,parking:source.parking,storage:source.storage,description:source.description,features:source.features,photos:source.photos.slice(0,24).map(image),floorPlan:source.floorPlan?image(source.floorPlan):null};
 const profileResponse=await checked(await agentRequest(agent,`listory_agent_profiles?id=eq.${agent.user.id}&select=brand`)),[profile]=await profileResponse.json();
 // Never use demonstration branding. Prefer the actual account profile; an empty
 // account profile remains empty rather than silently inheriting sample details.
 const saved=profile?.brand||{},brand={} as BrandProfile;
 for(const key of ['firstName','lastName','title','teamName','brokerageName','phone','email','website','instagram','primaryColour','secondaryColour','headshot','personalLogo','brokerageLogo'] as (keyof BrandProfile)[]){const v=saved[key];brand[key]=typeof v==='string'?v:'';}
 for(const key of ['headshot','personalLogo','brokerageLogo'] as const)if(brand[key]&&!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(brand[key]))brand[key]='';
 if(!/^#[a-f0-9]{6}$/i.test(brand.primaryColour))brand.primaryColour='#244b3d';
 if(!/^#[a-f0-9]{6}$/i.test(brand.secondaryColour))brand.secondaryColour='#eaece2';
 let event:SocialEvent|null=null;
 if(kind.startsWith('open-house')){const events=await socialEvents(request,slug);event=events.find(e=>e.id===eventId)||null;if(!event)throw new PropertyError('Choose an upcoming Open House from this listing. Expired or closed events cannot be promoted.',400);}
 return{kind,listing,brand,event,propertyUrl:row.status==='published'?`${siteOrigin()}/property/${slug}`:''};
}
