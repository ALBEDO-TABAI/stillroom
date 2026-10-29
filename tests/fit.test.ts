import { expect, test } from 'vitest';
import { fitCamera } from '../src/lib/fit';
import { demoNotes } from '../src/fixtures/demo';
test('fit camera matches the reference first frame at 1440x900', () => {
  expect(fitCamera(demoNotes(), 1440, 900, { pad: -50, zoomIn: 1.3, centerHero: true })).toEqual({ x: 668, y: 494, z: 0.7414814814814815 });
});
