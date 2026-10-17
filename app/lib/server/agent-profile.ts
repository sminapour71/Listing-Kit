import 'server-only';
import sharp from 'sharp';
import { agentRequest, type AgentSession } from './auth';
import { checked, PropertyError } from './properties';
import type { BrandProfile } from '../brand-profile';
export async function ensureAgentProfile(agent: AgentSession) {
  await checked(await agentRequest(agent, 'listory_agent_profiles?on_conflict=id', { method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({id:agent.user.id}) }));
}
export async function validateAccountBrand(value: unknown): Promise<BrandProfile> {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new PropertyError('Please check your Brand Profile.');
  const source=value as Record<string,unknown>,brand={} as BrandProfile;
  for(const key of ['firstName','lastName','title','teamName','brokerageName','phone','email','website','instagram','primaryColour','secondaryColour','headshot','personalLogo','brokerageLogo'] as (keyof BrandProfile)[]){
    const text=source[key];if(typeof text!=='string')throw new PropertyError('Please check your Brand Profile.');
    if(['headshot','personalLogo','brokerageLogo'].includes(key)){
      if(text===''){brand[key]='';continue;}
      const match=/^data:image\/(jpeg|png|webp);base64,([a-z0-9+/=]+)$/i.exec(text);
      if(!match||text.length>1_500_000)throw new PropertyError('Please upload a smaller JPG, PNG or WEBP brand image.');
      const image=await sharp(Buffer.from(match[2],'base64'),{limitInputPixels:16_000_000}).metadata().catch(()=>null);
      if(!image||!['jpeg','png','webp'].includes(image.format||'')||!image.width||!image.height||image.width>3600||image.height>3600)throw new PropertyError('One of the brand images could not be opened. Please upload it again.');
      brand[key]=text;
    }else{
      if(text.length>250)throw new PropertyError('Please shorten the long Brand Profile details.');brand[key]=text.trim();
      if(['primaryColour','secondaryColour'].includes(key)&&!/^#[a-f0-9]{6}$/i.test(text))throw new PropertyError('Check both brand colours.');
      if(key==='email'&&text&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))throw new PropertyError('Check your public contact email.');
    }
  }
  return brand;
}
