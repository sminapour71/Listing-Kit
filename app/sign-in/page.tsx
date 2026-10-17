import AccountForm from '../components/account-form';
import { currentAgent } from '../lib/server/auth';
import { safeReturnPath } from '../lib/auth-options';
import { redirect } from 'next/navigation';
export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params=await searchParams, next=safeReturnPath(params.next);
  if(await currentAgent())redirect(next);
  return <AccountForm mode="sign-in" next={next} linkError={params.error==='link'}/>;
}
