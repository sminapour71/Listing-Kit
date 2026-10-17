const timedFetch=(url:string,init:RequestInit={})=>fetch(url,{...init,signal:AbortSignal.timeout(15_000)});
import { randomBytes } from 'node:crypto';
export async function provisionAgent(confirmed=true) {
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)throw new Error('Supabase server bindings are required for account integration tests.');
  const email=`listory-test-${randomBytes(12).toString('hex')}@example.com`,password=randomBytes(32).toString('base64url');
  const response=await timedFetch(url+'/auth/v1/admin/users',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password,email_confirm:confirmed})});
  if(!response.ok)throw new Error(`Unable to provision isolated test account (${response.status}).`);
  const user=await response.json();
  return {id:user.id as string,email,password,async cleanup(){
    // Only records associated with this freshly generated test identity.
    const rows=await timedFetch(url+`/rest/v1/listory_properties?owner_id=eq.${user.id}&select=slug`,{headers:{apikey:key}});
    const ownedSlugs:string[]=rows.ok?(await rows.json()).map((row:{slug:string})=>row.slug):[];
    for(const slug of ownedSlugs){const row={slug};
      const assets=await timedFetch(url+'/storage/v1/object/list/listory-published',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({prefix:row.slug+'/',limit:1000})});
      if(assets.ok){const files=await assets.json();const prefixes=files.filter((f:{name:string})=>f.name).map((f:{name:string})=>row.slug+'/'+f.name);if(prefixes.length)await timedFetch(url+'/storage/v1/object/listory-published',{method:'DELETE',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({prefixes})});}
    }
    await timedFetch(url+`/rest/v1/listory_properties?owner_id=eq.${user.id}`,{method:'DELETE',headers:{apikey:key}});
    for(const slug of ownedSlugs)await timedFetch(url+`/rest/v1/listory_deleted_property_slugs?slug=eq.${slug}`,{method:'DELETE',headers:{apikey:key}});
    const result=await timedFetch(url+`/auth/v1/admin/users/${user.id}`,{method:'DELETE',headers:{apikey:key}});
    if(!result.ok)throw new Error('Unable to clean up isolated test identity.');
  }};
}
