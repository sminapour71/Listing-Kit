import AccountForm from '../components/account-form';
import { currentAgent } from '../lib/server/auth';
import { redirect } from 'next/navigation';
export default async function ResetPassword(){if(!await currentAgent())redirect('/sign-in?error=link');return <AccountForm mode="reset-password"/>;}
