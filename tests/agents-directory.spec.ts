import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {provisionAgent} from './helpers/agent';
import {sampleBrand} from '../app/lib/listing';
import {siteOrigin} from '../app/lib/site-url';
const origin='http://127.0.0.1:3100';
test('live directory exposes only safe public profiles from active accounts and requires a verified session',async({page,browser},info)=>{
 test.skip(process.env.LISTORY_LIVE_STORAGE_TEST!=='1','Opt in to isolated Supabase fixtures.');test.setTimeout(120000);
 const accounts:Awaited<ReturnType<typeof provisionAgent>>[]=[];let deletedId='';const guest=await browser.newContext();
 const base=process.env.SUPABASE_URL!,key=process.env.SUPABASE_SECRET_KEY!,group='Directory '+randomUUID().slice(0,8);
 const admin=(path:string,init:RequestInit={})=>fetch(base+path,{...init,headers:{apikey:key,...init.headers},signal:AbortSignal.timeout(20000)});
 try{
  // A small disposable group; never modify a real agent's status or portfolio.
  for(let i=0;i<7;i++)accounts.push(await provisionAgent(i!==5));
  const photo=`data:image/jpeg;base64,${(await readFile('public/images/property-1.jpg')).toString('base64')}`;
  for(const [i,a]of accounts.entries()){
   const brand={...sampleBrand,firstName:i===3?'':group,lastName:['Active Owner','Active Other','Private','Incomplete','Disabled','Unconfirmed','Deleted'][i],headshot:i===1?photo:'',email:`private-${i}@example.test`,phone:'604-555-0110',teamName:'Harbour '+group};
   const r=await admin('/rest/v1/listory_agent_profiles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:a.id,brand,portfolio_slug:'directory-'+a.id.slice(0,8),portfolio_published:i!==2,portfolio_bio:'Public portfolio fixture',portfolio_subareas:['Kitsilano']})});expect(r.ok).toBe(true);
  }
  expect((await admin('/auth/v1/admin/users/'+accounts[4].id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({ban_duration:'87600h'})})).ok).toBe(true);
  expect((await admin('/auth/v1/admin/users/'+accounts[6].id,{method:'DELETE'})).ok).toBe(true);deletedId=accounts[6].id;
  expect((await guest.request.get('/api/agents')).status()).toBe(401);const publicRoot=await guest.request.get('/#listory-agents');expect(new URL(publicRoot.url()).pathname).toBe('/sign-in');
  expect((await page.request.post('/api/auth/sign-in',{headers:{origin},data:{email:accounts[0].email,password:accounts[0].password}})).status()).toBe(200);
  const endpoint='/api/agents?q='+encodeURIComponent(group),r=await page.request.get(endpoint);expect(r.status()).toBe(200);expect(r.headers()['cache-control']).toContain('private');const data=await r.json();expect(data.agents).toHaveLength(2);expect(data.nextOffset).toBeNull();
  for(const a of data.agents)expect(Object.keys(a).sort()).toEqual(['brokerage','headshot','name','slug','team','url']);
  const json=JSON.stringify(data);for(const a of accounts){expect(json).not.toContain(a.id);expect(json).not.toContain(a.email);}for(const forbidden of ['private-','604-555-0110','owner_id','accountEmail','portfolio_bio','is_anonymous','email_confirmed_at','data:image'])expect(json).not.toContain(forbidden);
  expect((await (await page.request.get('/api/agents?q='+encodeURIComponent(group+' Active Other'))).json()).agents).toHaveLength(1);
  expect((await page.request.get('/api/agents?offset=-1')).status()).toBe(400);expect((await page.request.get('/api/agents?q='+'a'.repeat(121))).status()).toBe(400);
  const jwtResponse=await admin('/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:accounts[0].email,password:accounts[0].password})});expect(jwtResponse.ok).toBe(true);const jwt=(await jwtResponse.json()).access_token;
  const direct=await admin('/rest/v1/rpc/listory_directory_agents',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt},body:JSON.stringify({p_search:group})});expect(direct.status).toBe(403);
  await page.goto('/#listory-agents');await expect(page.getByRole('heading',{name:'Listory Agents',exact:true})).toBeVisible();const nav=page.getByRole('button',{name:'Listory Agents',exact:true});await expect(nav).toHaveAttribute('aria-current','page');await expect(page.getByRole('button',{name:/^Listings/})).not.toHaveAttribute('aria-current','page');
  await page.getByRole('searchbox',{name:'Search Listory Agents'}).fill(group);const cards=page.locator('.agents-directory-card');await expect(cards).toHaveCount(2);const target=cards.filter({hasText:'Active Other'});await expect(target.locator('img')).toBeVisible();await expect.poll(()=>target.locator('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  const slug='directory-'+accounts[1].id.slice(0,8);await expect(target).toHaveAttribute('href',siteOrigin()+'/agent/'+slug);expect((await guest.request.get('/agent/'+slug)).status()).toBe(200);
  await page.getByRole('searchbox').fill('not-an-agent-'+randomUUID());await expect(page.getByRole('heading',{name:'No Listory agents found.'})).toBeVisible();await page.getByRole('button',{name:'Clear search'}).click();await page.getByRole('searchbox').fill(group);await expect(cards).toHaveCount(2);await page.screenshot({path:info.outputPath('live-directory.png'),fullPage:true});
  // Hiding a profile removes it on the next uncached directory search.
  expect((await admin('/rest/v1/listory_agent_profiles?id=eq.'+accounts[1].id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolio_published:false})})).ok).toBe(true);expect((await (await page.request.get(endpoint)).json()).agents).toHaveLength(1);
 }finally{await guest.close();for(const a of accounts)if(a.id!==deletedId)await a.cleanup();}
});
