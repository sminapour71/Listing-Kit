import {test} from 'node:test';
import assert from 'node:assert/strict';
import {brochureSettings,brochureListing,storyExcerpt,withBrochurePhotos} from '../app/lib/brochure-studio.ts';
test('studio preferences are bounded and never mutate listing facts or public photo order',()=>{
 const settings=brochureSettings({design:'bad',format:'bad',coverIndex:900,captions:['x'.repeat(500)],coverFocal:{focalX:9,focalY:-2}});
 assert.equal(settings.design,'original');assert.equal(settings.format,'letter');assert.equal(settings.coverIndex,0);assert.equal(settings.captions[0].length,100);assert.deepEqual(settings.coverFocal,{focalX:1,focalY:0});
 const listing={address:'Source address',description:'An unchanged property description.',photos:[{id:'a',url:'first',focalX:.2,focalY:.4},{id:'b',url:'second'}]};
 const before=JSON.stringify(listing);const result=brochureListing(listing,{...settings,coverIndex:1});assert.equal(result.photos[0].id,'b');assert.equal(JSON.stringify(listing),before);assert.equal(result.description,listing.description);assert.equal(storyExcerpt('Short story.'),'Short story.');
 const text='A complete factual sentence. '.repeat(100);const excerpt=storyExcerpt(text,120);assert.ok(text.startsWith(excerpt));assert.ok(excerpt.endsWith('.'));assert.ok(excerpt.length<=120);
});

test('photo reordering/removal preserves captions and selected cover without changing public ordering',()=>{
 const original={photos:[{id:'a'},{id:'b'},{id:'c'}],brochure:{design:'editorial',format:'letter',coverIndex:1,captions:['A','B','C'],coverFocal:{focalX:.7,focalY:.4}}};
 const moved=withBrochurePhotos(original,[original.photos[2],original.photos[1],original.photos[0]]);assert.equal(moved.brochure.coverIndex,1);assert.deepEqual(moved.brochure.captions,['C','B','A']);assert.deepEqual(moved.brochure.coverFocal,original.brochure.coverFocal);
 const removed=withBrochurePhotos(moved,[moved.photos[0],moved.photos[2]]);assert.equal(removed.brochure.coverIndex,0);assert.equal(removed.brochure.coverFocal,undefined);assert.deepEqual(removed.brochure.captions,['C','A']);assert.equal(original.photos[0].id,'a');
});
