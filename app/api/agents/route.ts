import {requireAgent} from '../../lib/server/auth';
import {PropertyError} from '../../lib/server/properties';
import {getDirectoryAgents} from '../../lib/server/directory';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(request:Request){try{
 await requireAgent();
 const params=new URL(request.url).searchParams,q=(params.get('q')||'').trim(),offsetText=params.get('offset')||'0';
 if(!/^\d{1,7}$/.test(offsetText))throw new PropertyError('Please shorten your search or return to the first page.',400);
 return Response.json(await getDirectoryAgents(q,Number(offsetText)),{headers});
}catch(error){const known=error instanceof PropertyError;return Response.json({error:known?error.message:'We couldn’t load Listory Agents. Please try again.'},{status:known?error.status:500,headers});}}
