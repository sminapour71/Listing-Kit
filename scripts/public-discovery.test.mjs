import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoveryToday,numericFilter,queryText} from '../app/lib/public-discovery.ts';
test('Open Houses Today follows Pacific midnight across winter, summer and DST',()=>{
 for(const [instant,date] of [['2026-10-19T06:59:59Z','2026-10-18'],['2026-10-19T07:00:00Z','2026-10-19'],['2026-01-19T07:59:59Z','2026-01-18'],['2026-01-19T08:00:00Z','2026-01-19'],['2026-03-08T09:59:59Z','2026-03-08'],['2026-03-08T10:00:00Z','2026-03-08']])assert.equal(discoveryToday(new Date(instant)),date);
});
test('discovery filters accept finite numbers only and bound repeated/untrusted search parameters',()=>{
 for(const value of ['', 'Contact agent','Infinity','1e309','-1','12,000','0 OR 1=1'])assert.equal(numericFilter(value),null);
 assert.equal(numericFilter('1200000'),1200000);assert.equal(numericFilter('2.5'),2.5);assert.equal(numericFilter('0'),0);
 assert.equal(queryText({q:['one','two']},'q'), '');assert.equal(queryText({q:'x'.repeat(200)},'q',120).length,120);
});
