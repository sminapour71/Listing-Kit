'use client';
import {useEffect,useState} from 'react';
import {expiryReminder,listingLifecycle,promotionDate,type LifecycleDates} from '../lib/listing-lifecycle';
export default function ListingPromotion({row,onExtended}:{row:LifecycleDates&{slug:string};onExtended:()=>void}){
 const [now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30_000);return()=>clearInterval(timer);},[]);
 const status=listingLifecycle(row,now),current=status==='Current'||status==='Fresh';
 async function extend(){if(busy)return;setBusy(true);setError('');try{const r=await fetch(`/api/properties/${row.slug}/extend`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({current_until:row.current_until})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Please try again.');onExtended();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="listing-promotion">{current&&<><p>{expiryReminder(row,now)||`Current through ${promotionDate(row.current_until!)}`}</p><button disabled={busy} onClick={()=>void extend()}>{busy?'Extending…':'Extend 30 Days'}</button></>}{status==='Past'&&row.publication_date_unknown&&<p>Original publication date unavailable.</p>}{error&&<p role="alert">{error}</p>}</div>;
}
