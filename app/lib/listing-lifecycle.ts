// Promotion is independent of publication and any future explicit sale status.
export const DAY_MS = 86_400_000;
export type LifecycleDates = {status: 'draft'|'published'; first_published_at?:string|null; current_until?:string|null; publication_date_unknown?:boolean};
export function listingLifecycle(row:LifecycleDates,now=Date.now()):'Draft'|'Fresh'|'Current'|'Past' {
 if(row.status!=='published')return 'Draft';
 const until=Date.parse(row.current_until||'');
 if(!Number.isFinite(until)||until<=now)return 'Past';
 const first=Date.parse(row.first_published_at||'');
 return Number.isFinite(first)&&first<=now&&now-first<7*DAY_MS?'Fresh':'Current';
}
export function expiryReminder(row:LifecycleDates,now=Date.now()) {
 if(!['Fresh','Current'].includes(listingLifecycle(row,now)))return null;
 const remaining=Date.parse(row.current_until!)-now;
 if(remaining>5*DAY_MS)return null;
 const days=Math.ceil(remaining/DAY_MS);
 return days===1?'Moves to Past in 1 day':`Moves to Past in ${days} days`;
}
export function promotionDate(value:string){return new Intl.DateTimeFormat('en-CA',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Vancouver'}).format(new Date(value));}
