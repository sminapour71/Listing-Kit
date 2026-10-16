import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galleryLayout } from '../app/lib/brochure-layout.ts';
function check(ratios) {
  const plan = galleryLayout({ ratios, width: 728, height: 410 });
  assert.equal(plan.frames.length, ratios.length);
  for (const [i, a] of plan.frames.entries()) {
    assert.ok(a.width > 0 && a.height > 0);
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.width <= plan.width + .001 && a.y + a.height <= plan.height + .001);
    for (const b of plan.frames.slice(i + 1)) assert.ok(a.x + a.width <= b.x + .001 || b.x + b.width <= a.x + .001 || a.y + a.height <= b.y + .001 || b.y + b.height <= a.y + .001);
  }
  // Uncovered points can only lie within a 10px gutter, never a missing cell.
  for (let y=3;y<plan.height;y+=17) for (let x=3;x<plan.width;x+=17) {
    const distance=Math.min(...plan.frames.map(f=>Math.hypot(Math.max(f.x-x,0,x-f.x-f.width),Math.max(f.y-y,0,y-f.y-f.height))));
    assert.ok(distance<=10.001);
  }
  return plan;
}
test('all counts and orientation combinations fill intentional frames without holes or overlaps', () => {
  for(let count=1;count<=8;count++) for(let mask=0;mask<2**count;mask++) check(Array.from({length:count},(_,i)=>mask & 1<<i ? .6 : 1.5));
  for(let count=9;count<=15;count++) check(Array.from({length:count},(_,i)=>[.55,1.5,1,3][i%4]));
});
test('four landscape photos retain a clean two-by-two grid', () => {
  const {frames}=check([1.5,1.8,1.4,2]);
  assert.equal(frames[0].x,frames[2].x); assert.equal(frames[1].x,frames[3].x);
  assert.equal(frames[0].y,frames[1].y); assert.equal(frames[2].y,frames[3].y);
});
test('bad legacy dimensions fall back safely and repeated layout is deterministic', () => {
  const input={ratios:[NaN,0,1.5,.6],width:728,height:362};
  assert.deepEqual(galleryLayout(input),galleryLayout(input));
  assert.ok(galleryLayout(input).frames.every(f=>Object.values(f).every(Number.isFinite)));
});

test('three landscape photos favour an editorial feature and two supporting frames', () => {
  const {frames}=check([1.5,1.5,1.5]); const areas=frames.map(f=>f.width*f.height);
  assert.ok(Math.max(...areas)>Math.min(...areas)*2);
});

test('mixed portrait/landscape frames use the available page instead of a thumbnail strip', () => {
  assert.ok(check([.6,1.5,.6,1.5]).height > 300);
});
