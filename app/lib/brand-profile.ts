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
export function useBrandProfile() {
  const [profile, setProfile] = useState<BrandProfile>({ ...defaultBrandProfile });
  const [savedProfile, setSavedProfile] = useState<BrandProfile>({ ...defaultBrandProfile });
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BRAND_STORAGE_KEY);
      if (raw) {
        const loaded = readProfile(raw);
        setProfile(loaded); setSavedProfile(loaded);
      }
    } catch { setError('Your saved profile could not be opened. You can enter your details again and try saving.'); }
    setReady(true);
  }, []);
  const dirty = JSON.stringify(profile) !== JSON.stringify(savedProfile);
  function update<K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) {
    setProfile(current => ({ ...current, [key]: value })); setMessage('');
  }
  function save() {
    setError(''); setMessage('');
    if (!isHexColour(profile.primaryColour) || !isHexColour(profile.secondaryColour)) {
      setError('Enter both colours as a # followed by six letters or numbers, for example #244B3D.'); return;
    }
    try {
      localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(profile));
      setSavedProfile({ ...profile });
      setMessage('Brand profile saved in this browser. You can return and reuse it anytime.');
    } catch {
      setError('Your browser could not save this profile. Storage may be full or blocked. Try smaller images or allow site storage, then save again. Your edits are still on this screen.');
    }
  }
  return { profile, savedProfile, ready, dirty, message, error, update, save };
}
export type BrandProfileController = ReturnType<typeof useBrandProfile>;
