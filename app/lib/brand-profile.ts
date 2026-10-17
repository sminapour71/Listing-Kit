'use client';
import { useEffect, useState } from 'react';

export const BRAND_STORAGE_KEY = 'listingkit.brand-profile.v1';
export const defaultBrandProfile = {
  firstName: '', lastName: '', title: '', teamName: '', brokerageName: '',
  phone: '', email: '', website: '', instagram: '',
  headshot: '', personalLogo: '', brokerageLogo: '',
  primaryColour: '#244B3D', secondaryColour: '#EAECE2',
};
export type BrandProfile = typeof defaultBrandProfile;
export type BrandImageKey = 'headshot' | 'personalLogo' | 'brokerageLogo';
export const isHexColour = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
const isImage = (value: string) => /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value);

// A single versioned profile can be consumed by future marketing templates.
function readProfile(raw: string): BrandProfile {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid profile');
  const result = { ...defaultBrandProfile };
  for (const key of Object.keys(result) as (keyof BrandProfile)[]) {
    const value = (parsed as Record<string, unknown>)[key];
    if (typeof value !== 'string') continue;
    if (['headshot', 'personalLogo', 'brokerageLogo'].includes(key)) {
      if (value === '' || isImage(value)) result[key] = value;
    } else if (key === 'primaryColour' || key === 'secondaryColour') {
      if (isHexColour(value)) result[key] = value;
    } else result[key] = value.slice(0, 250);
  }
  return result;
}
export function useBrandProfile(userId: string) {
  const [profile,setProfile]=useState<BrandProfile>({...defaultBrandProfile});
  const [savedProfile,setSavedProfile]=useState<BrandProfile>({...defaultBrandProfile});
  const [ready,setReady]=useState(false),[saving,setSaving]=useState(false),[legacyAvailable,setLegacyAvailable]=useState(false);
  const [message,setMessage]=useState(''),[error,setError]=useState('');
  useEffect(()=>{
    let alive=true;setReady(false);
    (async()=>{try{
      // Old local data remains untouched, but is NEVER silently attached to an
      // account or shown as another signed-in agent's current profile.
      try{setLegacyAvailable(Boolean(localStorage.getItem(BRAND_STORAGE_KEY)));}catch{}
      const response=await fetch('/api/agent-profile',{cache:'no-store'}),data=await response.json();
      if(!response.ok)throw new Error(data.error||'Your account profile could not be opened.');
      if(data.id!==userId)throw new Error('Please sign in again to load your account profile.');
      const loaded=readProfile(JSON.stringify(data.brand));
      if(alive){setProfile(loaded);setSavedProfile(loaded);}
    }catch(e){if(alive)setError(e instanceof Error?e.message:'Your account profile could not be opened.');}
    finally{if(alive)setReady(true);}})();return()=>{alive=false;};
  },[userId]);
  const dirty=JSON.stringify(profile)!==JSON.stringify(savedProfile);
  function update<K extends keyof BrandProfile>(key: K,value: BrandProfile[K]){setProfile(current=>({...current,[key]:value}));setMessage('');}
  function importLegacy(){try{const raw=localStorage.getItem(BRAND_STORAGE_KEY);if(!raw)throw new Error();setProfile(readProfile(raw));setMessage('Your original browser profile is in the form. Review it, then click Save Brand Profile to connect it to this account. The original browser copy has been preserved.');setError('');}catch{setError('The original browser profile could not be opened. It has not been deleted.');}}
  async function save(){
    if(saving)return;setError('');setMessage('');
    if(!isHexColour(profile.primaryColour)||!isHexColour(profile.secondaryColour)){setError('Enter both colours as a # followed by six letters or numbers, for example #244B3D.');return;}
    setSaving(true);try{
      const response=await fetch('/api/agent-profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({brand:profile})}),data=await response.json();
      if(!response.ok)throw new Error(data.error||'Your profile could not be saved.');
      setSavedProfile({...profile});setMessage('Brand Profile saved to your account. It is ready when you sign in on another device.');
    }catch(e){setError((e instanceof Error?e.message:'Your account profile could not be saved.')+' Your edits are still on this screen.');}finally{setSaving(false);}
  }
  return {profile,savedProfile,ready,dirty,message,error,update,save,saving,legacyAvailable,importLegacy};
}
export type BrandProfileController = ReturnType<typeof useBrandProfile>;
