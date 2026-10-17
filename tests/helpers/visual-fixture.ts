// Presentation regression tests use REAL Supabase login and a private API fixture.
// The profile fixture adapts the old visual test data, not production behavior.
// Ownership authorization is tested separately in agent-accounts and auth-rls.
import { test as base, expect } from '@playwright/test';
import { provisionAgent } from './agent';
export const test=base.extend<{}, {agent:Awaited<ReturnType<typeof provisionAgent>>}>({
 agent:[async({},use)=>{const agent=await provisionAgent();try{await use(agent);}finally{await agent.cleanup();}},{scope:'worker'}],
 page:async({page,agent},use)=>{
   const login=await page.request.post('/api/auth/sign-in',{headers:{Origin:'http://127.0.0.1:3100'},data:{email:agent.email,password:agent.password}});
   expect(login.status()).toBe(200);
   let saved:unknown;
   await page.route('**/api/agent-profile',async route=>{
    if(route.request().method()==='PUT'){saved=route.request().postDataJSON().brand;await route.fulfill({json:{saved:true}});return;}
    const profile=saved??await page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('listingkit.brand-profile.v1')||'{}');}catch{return {};}}).catch(()=>({}));
    await route.fulfill({json:{id:agent.id,brand:profile}});
   });
   await page.route('**/api/properties',route=>route.request().method()==='GET'?route.fulfill({json:{properties:[]}}):route.continue());
   await use(page);
 }
});
export {expect};
