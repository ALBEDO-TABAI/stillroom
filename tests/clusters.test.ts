import { expect, test } from 'vitest';
import { clusters, silhouettePath } from '../src/canvas/clusters';
test('two docked modules form one cluster', () => {
  const c = clusters([{ id: 'a', r: { x: 0, y: 0, w: 100, h: 100 } }, { id: 'b', r: { x: 112, y: 0, w: 100, h: 50 } }, { id: 'c', r: { x: 500, y: 0, w: 10, h: 10 } }]);
  expect(c.length).toBe(2);
});
test('silhouette of the folder pair matches the reference outline', () => {
  // image 173x259 at (-701,62), folder 260x260 at (-516,62)
  const d = silhouettePath([{ x: -701, y: 62, w: 173, h: 259 }, { x: -516, y: 62, w: 260, h: 260 }]);
  expect(d.startsWith('M')).toBe(true);
  expect(d).toContain('A48.0,48.0');
});
import { pillRowPath } from '../src/lib/silhouette';
test('pill row silhouette matches the measured neck geometry', () => {
  const d = pillRowPath([48, 82.765625], 6);
  expect(d).toContain('43.258064516129');
  expect(d).toContain('7.7080724426670');
});
