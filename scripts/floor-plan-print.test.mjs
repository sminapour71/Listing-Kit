import {test} from 'node:test';import assert from 'node:assert/strict';
import {compactFloorPlan,projectedPlanText,floorPlanPrint} from '../app/lib/floor-plan-print.ts';
test('compact plans require known labels at least 8pt at actual print size',()=>{
 const detailed={pdfPages:1,floorPlanPrint:{widthPt:792,heightPt:612,smallestTextPt:12}};
 assert.equal(compactFloorPlan(detailed),false);assert.ok(projectedPlanText(detailed,720,320)<8);
 assert.equal(compactFloorPlan({floorPlanPrint:{widthPt:300,heightPt:240,smallestTextPt:16}}),true);
 assert.equal(compactFloorPlan({pdfPages:2,floorPlanPrint:{widthPt:300,heightPt:240,smallestTextPt:16}}),false);
 assert.equal(compactFloorPlan({url:'raster.png'}),false);assert.equal(compactFloorPlan(null),false);
 assert.equal(floorPlanPrint({widthPt:Infinity,heightPt:10,smallestTextPt:9}),undefined);
});
