import type {ListingImage} from './listing';
/** Metadata from the original PDF; all sizes are physical PDF points. */
export type FloorPlanPrint = {widthPt:number;heightPt:number;smallestTextPt:number};
export function floorPlanPrint(value:unknown):FloorPlanPrint|undefined {
 const v=value as Partial<FloorPlanPrint>|undefined;
 return v&&[v.widthPt,v.heightPt,v.smallestTextPt].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0&&x<=14400)?{widthPt:v.widthPt!,heightPt:v.heightPt!,smallestTextPt:v.smallestTextPt!}:undefined;
}
export function projectedPlanText(plan:ListingImage,widthPx:number,heightPx:number):number|undefined {
 const print=floorPlanPrint(plan.floorPlanPrint);if(!print)return;
 return print.smallestTextPt*Math.min(widthPx*.75/print.widthPt,heightPx*.75/print.heightPt);
}
/** Unknown/raster-only plans are kept in the full formats, never guessed legible. */
export function compactFloorPlan(plan:ListingImage|null):boolean {
 if(!plan||Number(plan.pdfPages||1)>1)return false;
 const size=projectedPlanText(plan,720,320);return size!==undefined&&size>=8;
}
/** Same decoded-image orientation policy in browser previews and PDF rendering. */
export function layoutFloorPlans(root:ParentNode|void=document) {
 (root||document).querySelectorAll<HTMLImageElement>('.brochure-has-floor-plan .brochure-plan>img,.studio-plan-page .studio-full-plan>img').forEach(image=>{
  image.closest('.brochure-paper')?.classList.toggle('brochure-portrait-plan',image.naturalHeight>image.naturalWidth);
 });
}
