import {redirect} from 'next/navigation';
import {currentAgent} from '../lib/server/auth';
import Workspace from '../components/workspace';
export const dynamic='force-dynamic';
export default async function AgentWorkspace(){
 const agent=await currentAgent();
 if(!agent)redirect('/sign-in?next=%2Fworkspace');
 return <Workspace user={{id:agent.user.id,email:agent.user.email||''}}/>;
}
