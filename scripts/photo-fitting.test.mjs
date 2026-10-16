import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describePhoto, photoFit, photoPosition, photoFocal, focalPosition } from '../app/lib/photo-fitting.ts';
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

test('validates optional normalized focal pairs and preserves full-photo fitting', () => {
  assert.deepEqual(photoFocal({ focalX: 0, focalY: 1 }), { focalX: 0, focalY: 1 });
  for (const value of [{}, { focalX: .5 }, { focalX: NaN, focalY: .5 }, { focalX: '0.5', focalY: .5 }, { focalX: -1, focalY: .5 }, { focalX: .5, focalY: Infinity }]) assert.equal(photoFocal(value), undefined);
  assert.equal(focalPosition({}, 1800, 1000, 816, 435, 'cover'), 'center');
  assert.equal(focalPosition({ focalX: .5, focalY: 0 }, 1800, 1000, 816, 435, 'cover'), '50% 0%');
  assert.equal(focalPosition({ focalX: .5, focalY: 1 }, 1800, 1000, 816, 435, 'cover'), '50% 100%');
  assert.equal(focalPosition({ focalX: 0, focalY: .5 }, 3000, 1000, 500, 500, 'cover'), '0% 50%');
  assert.equal(focalPosition({ focalX: 1, focalY: 1 }, 3000, 1000, 816, 435, 'contain'), '50% 50%');
  // Across differently shaped cropped frames the chosen source point is visible.
  for (const [width, height] of [[816, 435], [380, 176], [300, 320]]) for (const point of [0, .2, .5, .8, 1]) {
    const positions = focalPosition({ focalX: point, focalY: point }, 1800, 1000, width, height, 'cover').split(' ').map(parseFloat);
    const scale = Math.max(width / 1800, height / 1000);
    for (const [i, [source, frame]] of [[1800, width], [1000, height]].entries()) {
      const visiblePoint = (frame - source * scale) * positions[i] / 100 + point * source * scale;
      assert.ok(visiblePoint >= -.001 && visiblePoint <= frame + .001);
    }
  }
});
