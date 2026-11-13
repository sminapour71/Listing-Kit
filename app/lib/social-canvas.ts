'use client';
import type {SocialProject,SocialSlide} from './social-media';
import {eventDate,eventTime} from './open-house';
import {money,number,type ListingImage} from './listing';
import {photoFocal,photoPosition} from './photo-fitting';
const SERIF='"Listory Brochure Serif"',SANS='"Listory Brochure Sans"';
const IVORY='#f6f3eb',INK='#252b27',MUTED='#62685e';
export class SocialCanvas {
 readonly canvas=document.createElement('canvas');
 private images=new Map<string,ImageBitmap>();
 private backgrounds=new Map<string,HTMLCanvasElement>();
 constructor(readonly project:SocialProject,readonly signal:AbortSignal){this.canvas.width=1080;this.canvas.height=project.kind.includes('reel')||project.kind==='open-house-story'?1920:1350;}
 async init(){await Promise.all([document.fonts.load(`400 48px ${SERIF}`),document.fonts.load(`400 24px ${SANS}`)]);await document.fonts.ready;this.signal.throwIfAborted();if(!document.fonts.check(`400 48px ${SERIF}`))throw new Error('The design fonts could not load. Refresh and try again.');for(const key of ['headshot','personalLogo','brokerageLogo'] as const)if(this.project.brand[key])await this.image(this.project.brand[key]);}
 private async image(url:string){this.signal.throwIfAborted();const hit=this.images.get(url);if(hit){this.images.delete(url);this.images.set(url,hit);return hit;}
  if(!url.startsWith('/api/properties/')&&!/^data:image\/(png|jpeg|webp);base64,/.test(url))throw new Error('A saved image is unavailable. Reopen and save the listing, then try again.');
  const r=await fetch(url,{signal:this.signal,cache:'no-store'});if(!r.ok)throw new Error('A saved image could not be loaded. Your listing has not changed.');const blob=await r.blob();if(blob.size>4_000_000)throw new Error('A saved image is too large for this export.');
  let bitmap=await createImageBitmap(blob);const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));if(scale<1){const reduced=await createImageBitmap(bitmap,{resizeWidth:Math.round(bitmap.width*scale),resizeHeight:Math.round(bitmap.height*scale),resizeQuality:'high'});bitmap.close();bitmap=reduced;}
  this.images.set(url,bitmap);while(this.images.size>7){const first=this.images.keys().next().value!;this.images.get(first)!.close();this.images.delete(first);this.backgrounds.delete(first);}return bitmap;
 }
 private context(){const c=this.canvas.getContext('2d');if(!c)throw new Error('Image generation is unavailable in this browser. Try Chrome or Edge.');return c;}
 private text(value:string,x:number,y:number,width:number,size:number,lines=1,serif=false,color=INK){const c=this.context();let words=value.trim().split(/\s+/),rows:string[]=[];if(!value.trim())return y;
  for(;size>=16;size-=2){c.font=`400 ${size}px ${serif?SERIF:SANS}`;rows=[];let row='';for(const word of words){if(c.measureText(word).width>width){row='';rows=Array(lines+1).fill('');break;}const next=row?row+' '+word:word;if(c.measureText(next).width>width){rows.push(row);row=word;}else row=next;}rows.push(row);if(rows.length<=lines)break;}
  if(rows.length>lines)throw new Error('Some listing or branding text is too long for a readable social graphic. Shorten that field and try again.');c.fillStyle=color;rows.forEach((row,i)=>c.fillText(row,x,y+i*size*1.2));return y+rows.length*size*1.2;
 }
 private contain(image:CanvasImageSource&{width:number;height:number},x:number,y:number,w:number,h:number){const s=Math.min(w/image.width,h/image.height);this.context().drawImage(image,x+(w-image.width*s)/2,y+(h-image.height*s)/2,image.width*s,image.height*s);}
 private photo(image:ImageBitmap,p:ListingImage,x:number,y:number,w:number,h:number,motion:number){const c=this.context();c.save();c.beginPath();c.rect(x,y,w,h);c.clip();let bg=this.backgrounds.get(p.url);if(!bg){bg=document.createElement('canvas');bg.width=270;bg.height=320;const b=bg.getContext('2d')!,s=Math.max(bg.width/image.width,bg.height/image.height);b.filter='blur(12px)';b.drawImage(image,(bg.width-image.width*s)/2,(bg.height-image.height*s)/2,image.width*s,image.height*s);b.fillStyle='#f6f3eb55';b.fillRect(0,0,bg.width,bg.height);this.backgrounds.set(p.url,bg);}const backgroundScale=Math.max(w/bg.width,h/bg.height);c.drawImage(bg,x+(w-bg.width*backgroundScale)/2,y+(h-bg.height*backgroundScale)/2,bg.width*backgroundScale,bg.height*backgroundScale);
  // The foreground always contains the complete photo. Movement uses the spare
  // margin rather than cutting architecture out of a landscape photograph.
  const scale=Math.min((w-36)/image.width,(h-36)/image.height)*(1+motion*.018),pw=image.width*scale,ph=image.height*scale;
  const focal=photoFocal(p),position=photoPosition(p.position),fx=focal?.focalX??(position==='left'?0:position==='right'?1:.5),fy=focal?.focalY??(position==='top'?0:position==='bottom'?1:.5);
  const px=x+(w-pw)/2+(fx-.5)*Math.max(0,w-pw)*.18*(motion-.5),py=y+(h-ph)/2+(fy-.5)*Math.max(0,h-ph)*.18*(motion-.5);c.drawImage(image,px,py,pw,ph);c.restore();
 }
 private async brand(y:number){const b=this.project.brand,c=this.context(),name=[b.firstName,b.lastName].filter(Boolean).join(' ');c.strokeStyle='#c9cec3';c.lineWidth=1;c.beginPath();c.moveTo(64,y-32);c.lineTo(1016,y-32);c.stroke();
  const head=b.headshot?await this.image(b.headshot):null,left=head?154:64,w=head?620:710;if(head)this.contain(head,64,y-8,66,87);
  const nameEnd=this.text(name,left,y+16,w,27,2,true);let next=Math.max(y+48,nameEnd+6);
  if(b.title||b.teamName){this.text([b.title,b.teamName].filter(Boolean).join(' · '),left,next,w,21,1,false,MUTED);next+=26;}
  this.text(b.brokerageName,left,next,w,23,2);next+=48;
  this.text([b.phone,b.website||b.email].filter(Boolean).join(' · '),left,next,w,21,1,false,MUTED);
  let ly=y-12;for(const key of ['personalLogo','brokerageLogo'] as const)if(b[key]){this.contain(await this.image(b[key]),845,ly,170,52);ly+=65;}
 }
 async draw(slide:SocialSlide,motion=0,ending=false){this.signal.throwIfAborted();const c=this.context(),{listing:l,brand:b,kind,event}=this.project,tall=this.canvas.height===1920;const image=slide.photo?await this.image(slide.photo.url):null;
  c.clearRect(0,0,1080,this.canvas.height);c.fillStyle=IVORY;c.fillRect(0,0,1080,this.canvas.height);c.fillStyle=/^#[a-f0-9]{6}$/i.test(b.primaryColour)?b.primaryColour:'#244b3d';c.fillRect(64,69,42,3);
  this.text('LISTORY / THE PROPERTY JOURNAL',127,78,760,17);this.text(String(slide.index+1).padStart(2,'0'),970,78,50,17);
  if(tall){if(image)this.photo(image,slide.photo!,40,145,1000,1115,motion);
   const label=event?'OPEN HOUSE':ending?'DISCOVER THE FULL STORY':'THE RESIDENCE';this.text(label,64,1320,950,event?36:24,1,false,MUTED);
   this.text(l.address,64,1388,950,49,3,true);
   if(event){this.text(eventDate(event.event_date),64,1590,950,35,1,true);this.text(`${eventTime(event.start_time)} – ${eventTime(event.end_time)} · Pacific`,64,1650,950,34);}
   else{if(l.price)this.text(money(l.price),64,1610,950,37,1,true);this.text(this.specs().join('    /    '),64,1660,950,24);}
   await this.brand(1720);return;
  }
  if(slide.role==='plan'&&l.floorPlan){const plan=await this.image(l.floorPlan.url);c.fillStyle='#fff';c.fillRect(64,150,952,900);this.contain(plan,75,165,930,800);this.text('FLOOR PLAN / VERIFY ALL MEASUREMENTS',64,1080,950,18);await this.brand(1145);return;}
  if(slide.role==='photo'){if(image)this.photo(image,slide.photo!,40,130,1000,880,0);this.text(l.address,64,1046,950,26,2,true);if(slide.photo?.caption?.trim())this.text(slide.photo.caption.trim(),64,1116,950,21,1,false,MUTED);await this.brand(1170);return;}
  if(slide.role==='contact'){if(image)this.photo(image,slide.photo!,40,130,1000,510,0);this.text('Discover the full story.',64,735,950,58,1,true);this.text(l.address,64,815,950,37,3,true);if(this.project.propertyUrl)this.text(this.project.propertyUrl.replace('https://',''),64,1010,950,23,2,false,MUTED);await this.brand(1130);return;}
  if(image)this.photo(image,slide.photo!,40,130,1000,615,0);
  const label=kind==='just-sold'?'JUST SOLD':kind==='just-listed'?'JUST LISTED':slide.role==='features'?'SELECTED DETAILS':slide.role==='specifications'?'THE PARTICULARS':'THE RESIDENCE';this.text(label,64,802,950,28,1,false,MUTED);
  if(slide.role==='features'){const features=l.features.split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean).slice(0,5);for(const [i,value]of features.entries())this.text(value,64,862+i*44,950,27,1,true);}
  else if(slide.role==='specifications'){const values=[...(l.price?[money(l.price)]:[]),...this.specs()];values.forEach((value,i)=>this.text(value,64+(i%2)*490,885+Math.floor(i/2)*105,450,36,2,true));}
  else{this.text(l.address,64,858,950,44,3,true);if(kind!=='just-sold'&&l.price)this.text(money(l.price),64,1030,950,33,1,true);if(kind!=='just-sold')this.text(this.specs().join('    /    '),64,1074,950,23);}
  await this.brand(1150);
 }
 private specs(){const l=this.project.listing;return[l.bedrooms?`${l.bedrooms} bedrooms`:'',l.bathrooms?`${l.bathrooms} bathrooms`:'',l.squareFootage?`${number(l.squareFootage)} sq ft`:''].filter(Boolean);}
 async png(){this.signal.throwIfAborted();return new Promise<Blob>((resolve,reject)=>this.canvas.toBlob(b=>b?resolve(b):reject(new Error('The image could not be prepared.')),'image/png'));}
 dispose(){for(const image of this.images.values())image.close();this.images.clear();this.backgrounds.clear();this.canvas.width=this.canvas.height=1;}
}
