'use client';
import {SocialCanvas} from './social-canvas';
import {isSocialVideo,reelTiming,socialFilename,socialSlides,type SocialProject} from './social-media';
export type SocialCreation={blob:Blob;filename:string;slides:Blob[];video:boolean;seconds?:number;width:number;height:number};
export async function createSocial(project:SocialProject,signal:AbortSignal,notify:(message:string)=>void,short=false):Promise<SocialCreation>{
 const renderer=new SocialCanvas(project,signal),name=socialFilename(project.listing.address,project.kind);
 try{notify('Preparing your photographs and saved branding…');await renderer.init();
  if(isSocialVideo(project.kind)){
   const {Output,Mp4OutputFormat,BufferTarget,CanvasSource,canEncodeVideo}=await import('mediabunny');
   if(typeof VideoEncoder==='undefined'||!await canEncodeVideo('avc',{width:1080,height:1920,frameRate:24}))throw new Error('MP4 export is not supported in this browser. Open Listory in a current desktop Chrome or Edge. Your image and carousel exports are still available.');
   const {count,seconds,fps}=reelTiming(project.listing.photos.length,short),photos=project.listing.photos.slice(0,count),frames=Math.round(seconds*fps),segment=frames/count;
   const output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target:new BufferTarget()}),source=new CanvasSource(renderer.canvas,{codec:'avc',bitrate:6_000_000,keyFrameInterval:2});output.addVideoTrack(source,{frameRate:fps});
   const fade=document.createElement('canvas');fade.width=1080;fade.height=1920;const fc=fade.getContext('2d')!;
   const cancel=()=>{void output.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
   try{await output.start();notify('Creating your silent MP4. Keep this tab open; you can cancel at any time…');
    let lastIndex=-1;
    for(let frame=0;frame<frames;frame++){signal.throwIfAborted();const index=Math.min(count-1,Math.floor(frame/segment)),phase=(frame-index*segment)/segment;if(index!==lastIndex){notify(`Composing photograph ${index+1} of ${count}. Keep this tab open…`);lastIndex=index;}
     await renderer.draw({role:'photo',photo:photos[index],index},phase,index===count-1);
     if(index<count-1&&phase>.84){fc.clearRect(0,0,1080,1920);fc.drawImage(renderer.canvas,0,0);await renderer.draw({role:'photo',photo:photos[index+1],index:index+1},0,index+1===count-1);const ctx=renderer.canvas.getContext('2d')!;ctx.globalAlpha=1-(phase-.84)/.16;ctx.drawImage(fade,0,0);ctx.globalAlpha=1;}
     await source.add(frame/fps,1/fps);if(frame%12===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    signal.throwIfAborted();notify('Finishing your MP4…');await output.finalize();signal.throwIfAborted();if(!output.target.buffer?.byteLength)throw new Error('The MP4 was not completed. Please try again.');return{blob:new Blob([output.target.buffer],{type:'video/mp4'}),filename:name+'.mp4',slides:[],video:true,seconds,width:1080,height:1920};
   }catch(error){await output.cancel().catch(()=>{});throw error;}finally{signal.removeEventListener('abort',cancel);fade.width=fade.height=1;}
  }
  const definitions=project.kind==='carousel'?socialSlides(project):[{role:'cover' as const,photo:project.listing.photos[0],index:0}],slides:Blob[]=[];
  for(const slide of definitions){notify(`Preparing image ${slide.index+1} of ${definitions.length}…`);await renderer.draw(slide);slides.push(await renderer.png());signal.throwIfAborted();await new Promise(resolve=>setTimeout(resolve,0));}
  if(project.kind==='carousel'){const{zipSync}=await import('fflate'),files:Record<string,Uint8Array>={};for(const [i,blob]of slides.entries())files[`${String(i+1).padStart(2,'0')}-${definitions[i].role}.png`]=new Uint8Array(await blob.arrayBuffer());signal.throwIfAborted();const bytes=zipSync(files,{level:0});return{blob:new Blob([new Uint8Array(bytes)],{type:'application/zip'}),filename:name+'.zip',slides,video:false,width:1080,height:1350};}
  return{blob:slides[0],filename:name+'.png',slides,video:false,width:1080,height:renderer.canvas.height};
 }finally{renderer.dispose();}
}
