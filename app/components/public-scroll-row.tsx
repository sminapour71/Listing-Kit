'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
export default function PublicScrollRow({label,children}:{label:string;children:React.ReactNode}){
 const ref=useRef<HTMLDivElement>(null),id=useId(),[position,setPosition]=useState({overflow:false,start:true,end:false});
 function update(){const el=ref.current;if(!el)return;const next={overflow:el.scrollWidth>el.clientWidth+1,start:el.scrollLeft<=1,end:el.scrollLeft+el.clientWidth>=el.scrollWidth-1};setPosition(old=>old.overflow===next.overflow&&old.start===next.start&&old.end===next.end?old:next);}
 useEffect(()=>{const el=ref.current;if(!el)return;update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect();},[children]);
 function scroll(direction:number){const el=ref.current;if(el)el.scrollBy({left:direction*el.clientWidth*.85,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 return <div className="public-carousel">{position.overflow&&<div className="public-row-controls"><button type="button" disabled={position.start} aria-label={`Previous ${label}`} aria-controls={id} onClick={()=>scroll(-1)}><ArrowLeft size={18}/></button><button type="button" disabled={position.end} aria-label={`Next ${label}`} aria-controls={id} onClick={()=>scroll(1)}><ArrowRight size={18}/></button></div>}<div ref={ref} id={id} className="public-scroll-row" role="region" aria-label={label} tabIndex={0} onScroll={update}>{children}</div></div>;
}
