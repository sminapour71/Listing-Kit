'use client';
import {useEffect} from 'react';
const views=new Set(['listings','create-listing','brand-profile','marketing-package','listory-agents']);
export default function LegacyWorkspaceEntry(){
 useEffect(()=>{const forward=()=>{if(views.has(window.location.hash.slice(1)))window.location.replace('/workspace'+window.location.hash);};forward();window.addEventListener('hashchange',forward);return()=>window.removeEventListener('hashchange',forward);},[]);
 return null;
}
