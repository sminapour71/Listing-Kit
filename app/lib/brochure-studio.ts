import type {Listing} from './listing';
import type {PhotoFocal} from './photo-fitting';
export const designs = [
  {id:'original',name:'Listory Original',description:'Timeless Listory presentation.'},
  {id:'minimalist',name:'Montserrat Minimalist',description:'Modern architecture. Considered simplicity.'},
  {id:'editorial',name:'Classic Editorial',description:'An address worth publishing.'},
] as const;
export type BrochureDesign = typeof designs[number]['id'];
export type BrochureFormat = 'double-sided'|'letter'|'folded';
export type BrochureSettings = {design:BrochureDesign;format:BrochureFormat;coverIndex:number;coverFocal?:PhotoFocal;captions:string[]};
export const defaultBrochureSettings:BrochureSettings={design:'original',format:'letter',coverIndex:0,captions:[]};
export const formats = [
 {id:'double-sided',name:'Double-Sided Letter',description:'One sheet. A complete introduction.',detail:'2 portrait pages · 8.5 × 11 · Duplex, long edge'},
 {id:'letter',name:'Existing Letter Brochure',description:'The full four-page property story.',detail:'4 portrait pages · 8.5 × 11'},
 {id:'folded',name:'Large Folded Brochure',description:'A generous, considered presentation.',detail:'2 landscape spreads · 11 × 17 · Duplex, short edge'},
] as const;
export function brochureSettings(value:unknown):BrochureSettings {
 const v=(value||{}) as Partial<BrochureSettings>;
 return {design:designs.some(d=>d.id===v.design)?v.design!:'original',format:formats.some(f=>f.id===v.format)?v.format!:'letter',coverIndex:Number.isInteger(v.coverIndex)&&v.coverIndex!>=0&&v.coverIndex!<16?v.coverIndex!:0,captions:Array.isArray(v.captions)?v.captions.slice(0,16).map(x=>typeof x==='string'?x.trim().slice(0,100):''):[],...(v.coverFocal&&Number.isFinite(v.coverFocal.focalX)&&Number.isFinite(v.coverFocal.focalY)?{coverFocal:{focalX:Math.min(1,Math.max(0,v.coverFocal.focalX)),focalY:Math.min(1,Math.max(0,v.coverFocal.focalY))}}:{})};
}
export function brochureListing(listing:Listing,settings:BrochureSettings):Listing {
 const index=Math.min(settings.coverIndex,Math.max(0,listing.photos.length-1));
 const photos=listing.photos.map((photo,i)=>({...photo,caption:settings.captions[i]||'',...(i===index&&settings.coverFocal?settings.coverFocal:{})}));
 return {...listing,photos:photos[index]?[photos[index],...photos.filter((_,i)=>i!==index)]:photos};
}
/** Cut only at sentence/word boundaries; the full listing remains untouched. */
export function storyExcerpt(text:string,max=650) {
 const clean=text.trim();if(clean.length<=max)return clean;
 const chunk=clean.slice(0,max);const sentence=Math.max(chunk.lastIndexOf('. '),chunk.lastIndexOf('! '),chunk.lastIndexOf('? '));
 return sentence>max*.45?chunk.slice(0,sentence+1):chunk.slice(0,chunk.lastIndexOf(' '))+'…';
}
/** Keep cover and captions attached to their photos when the listing is reordered. */
export function withBrochurePhotos(listing:Listing,photos:Listing['photos']):Listing {
 if(!listing.brochure)return {...listing,photos};
 const settings=brochureSettings(listing.brochure),cover=listing.photos[settings.coverIndex];
 const coverIndex=photos.findIndex(p=>p.id===cover?.id);
 return {...listing,photos,brochure:{...settings,coverIndex:Math.max(0,coverIndex),coverFocal:coverIndex<0?undefined:settings.coverFocal,captions:photos.map(p=>settings.captions[listing.photos.findIndex(previous=>previous.id===p.id)]||'')}};
}
