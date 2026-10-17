import {requireAgent} from '../../../lib/server/auth';
import {slugAvailable} from '../../../lib/server/portfolio';
import {propertyFailure} from '../../../lib/server/properties';
export async function GET(request:Request){try{const a=await requireAgent();const slug=new URL(request.url).searchParams.get('slug')||'';return Response.json({available:await slugAvailable(slug,a.user.id)},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return propertyFailure(e)}}
