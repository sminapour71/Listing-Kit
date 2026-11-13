import {socialCards} from '../../lib/server/social-media';
import {propertyFailure} from '../../lib/server/properties';
export const runtime='nodejs';
export async function GET(){try{return Response.json({properties:await socialCards()},{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch(e){return propertyFailure(e);}}
