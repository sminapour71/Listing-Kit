import { redirect } from 'next/navigation';
import { currentAgent } from './lib/server/auth';
import Workspace from './components/workspace';
export default async function Home(){
  const agent=await currentAgent();
  if(!agent)redirect('/sign-in');
  return <Workspace user={{id:agent.user.id,email:agent.user.email||''}}/>;
}
