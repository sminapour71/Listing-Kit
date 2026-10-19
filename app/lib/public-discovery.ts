export const DISCOVERY_TIME_ZONE='America/Vancouver';
export function discoveryToday(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:DISCOVERY_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const value=(type:string)=>parts.find(p=>p.type===type)!.value;
 return `${value('year')}-${value('month')}-${value('day')}`;
}
export type DiscoveryQuery=Record<string,string|string[]|undefined>;
export const queryText=(q:DiscoveryQuery,key:string,max=150)=>typeof q[key]==='string'?(q[key] as string).slice(0,max):'';
export function numericFilter(value:string){const n=Number(value);return /^\d+(\.\d+)?$/.test(value.trim())&&Number.isFinite(n)?n:null;}
