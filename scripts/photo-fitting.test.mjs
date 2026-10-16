import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describePhoto, photoFit, photoPosition } from '../app/lib/photo-fitting.ts';
test('classifies actual dimensions without assuming landscape or trusting stale metadata', () => {
  assert.equal(describePhoto(3000, 2000).orientation, 'landscape');
  assert.equal(describePhoto(900, 1500).orientation, 'portrait');
  assert.equal(describePhoto(1050, 1000).orientation, 'square');
  assert.equal(describePhoto(0, 100).orientation, undefined);
  assert.equal(describePhoto(3000, 2000).aspectRatio, 1.5);
});
test('contains mismatched frames and permits only mild cropping', () => {
  assert.equal(photoFit(3000, 750, 816, 435, 'feature'), 'contain');
  assert.equal(photoFit(750, 1500, 816, 435, 'feature'), 'contain');
  assert.equal(photoFit(1500, 1000, 150, 100, 'feature'), 'cover');
  assert.equal(photoFit(1500, 1000, 165, 100, 'feature'), 'contain');
  assert.equal(photoFit(1500, 1000, 165, 100, 'secondary'), 'cover');
  assert.equal(photoFit(1500, 1000, 200, 100, 'secondary'), 'contain');
  assert.equal(photoFit(1500, 1000, 165, 100, 'natural'), 'contain');
  assert.equal(photoFit(0, 0, 0, 0), 'contain');
});
test('uses a safe centered focal position and accepts simple future positions', () => {
  assert.equal(photoPosition(), 'center');
  for (const position of ['top', 'bottom', 'left', 'right', 'center']) assert.equal(photoPosition(position), position);
  assert.equal(photoPosition('left; background:url(invalid)'), 'center');
});
