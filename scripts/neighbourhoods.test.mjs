import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isYaletownAddress, hasYaletownSpecialty} from '../app/lib/neighbourhoods.ts';

test('Yaletown inventory requires explicit neighbourhood and city, never street or fuzzy locality inference', () => {
  for (const address of ['1806 · 1480 Howe Street, Yaletown, Vancouver', '123 Example St, YALETOWN, VANCOUVER, BC', '123 Example St, Yaletown, Vancouver BC V6B 1A1']) assert.equal(isYaletownAddress(address), true, address);
  for (const address of ['', '1480 Howe Street, Vancouver', '123 Example St, Yaletown', '123 Example St, Yaletowner, Vancouver', 'Yaletown Realty, 123 Example St, North Vancouver', 'Yaletown, West Vancouver']) {
    assert.equal(isYaletownAddress(address), false, address);
  }
});
test('specialty selection is exact, case-insensitive and excludes fuzzy/brokerage matches', () => {
  for (const areas of [['Kitsilano','Yaletown'], [' YALETOWN ']]) assert.equal(hasYaletownSpecialty(areas), true);
  for (const areas of [null, {}, 'Yaletown', [], ['Yaletown Realty'], ['Yaletown & Downtown'], ['near Yaletown'], [null, 9]]) assert.equal(hasYaletownSpecialty(areas), false);
});
