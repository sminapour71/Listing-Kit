import {test as base,expect} from '@playwright/test';
import {provisionAgent} from './agent';
export const test=base.extend<{}, {agent:Awaited<ReturnType<typeof provisionAgent>>}>({
 agent:[async({},use)=>{const agent=await provisionAgent();try{await use(agent);}finally{await agent.cleanup();}},{scope:'worker'}],
 page:async({page,agent},use)=>{
  const login=await page.request.post('/api/auth/sign-in',{headers:{origin:'http://127.0.0.1:3100'},data:{email:agent.email,password:agent.password}});expect(login.status()).toBe(200);
  await use(page);
 }
});
export {expect};
