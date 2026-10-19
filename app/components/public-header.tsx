'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {Menu,X,ArrowUpRight} from 'lucide-react';
import Wordmark from './wordmark';
import {publicNavigation} from '../lib/public-navigation';
export default function PublicHeader({signedIn,cinematicHero=false}:{signedIn:boolean;cinematicHero?:boolean}){
 const [open,setOpen]=useState(false),path=usePathname(),toggle=useRef<HTMLButtonElement>(null);
 const [overHero,setOverHero]=useState(cinematicHero);
 useEffect(()=>{
  if(!cinematicHero)return;
  const hero=document.querySelector('.yaletown-hero');if(!hero)return;
  const observer=new IntersectionObserver(([entry])=>setOverHero(entry.isIntersecting),{rootMargin:'-90px 0px 0px 0px'});
  observer.observe(hero);return ()=>observer.disconnect();
 },[cinematicHero]);
 useEffect(()=>setOpen(false),[path]);
 return <header className={`public-header${cinematicHero?' public-header-cinematic':''}${cinematicHero&&overHero&&!open?' is-over-hero':''}`} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);toggle.current?.focus();}}}>
  <a href="/" className="public-logo" aria-label="Listory home"><Wordmark/></a>
  <button ref={toggle} type="button" className="public-menu-toggle" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="public-navigation" onClick={()=>setOpen(!open)}>{open?<X size={22}/>:<Menu size={22}/>}</button>
  <nav id="public-navigation" className={open?'public-navigation is-open':'public-navigation'} aria-label="Public navigation">
   <div className="public-main-links">{publicNavigation.map(([label,href])=><a key={href} href={href} aria-current={path===href?'page':undefined}>{label}</a>)}</div>
   <div className="public-account-links"><a href="/for-agents" aria-current={path==='/for-agents'?'page':undefined}>For Agents</a><a className="public-account-link" href={signedIn?'/workspace':'/sign-in'}>{signedIn?'Workspace':'Sign In'}<ArrowUpRight size={14}/></a></div>
  </nav>
 </header>;
}
