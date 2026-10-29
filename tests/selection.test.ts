import { expect, test } from 'vitest';
import { adaptiveSnap, scaleSelection, folderSelection } from '../src/canvas/selection';
import { useStore, blankNote } from '../src/store/store';

test('side docking matches height, vertical docking matches width, and distant cards do not snap', () => {
  const others = [{ id: 'target', r: { x: 0, y: 0, w: 300, h: 200 } }];
  expect(adaptiveSnap([{ id: 'moving', r: { x: 315, y: 20, w: 120, h: 180 } }], others, 12, 26)).toMatchObject({ x: 312, y: 0, k: 200 / 180 });
  expect(adaptiveSnap([{ id: 'moving', r: { x: 10, y: 215, w: 120, h: 180 } }], others, 12, 26)).toMatchObject({ x: 0, y: 212, k: 2.5 });
  expect(adaptiveSnap([{ id: 'moving', r: { x: 900, y: 900, w: 120, h: 180 } }], others, 12, 26)).toBeNull();
});

test('group scaling preserves proportions and relative positions without compounding', () => {
  const a = blankNote('image', 0, 0, { id: 'a', metadata: { displayWidth: 200, aspectRatio: 0.5 } });
  const b = blankNote('image', 212, 0, { id: 'b', metadata: { displayWidth: 100, aspectRatio: 1 } });
  const rects = { a: { x: 0, y: 0, w: 200, h: 100 }, b: { x: 212, y: 0, w: 100, h: 100 } };
  const scaled = scaleSelection({ a, b }, rects, { x: 0, y: 0 }, { x: 100, y: 300 }, 2);
  expect(scaled.a.metadata?.displayWidth).toBe(400);
  expect(scaled.b).toMatchObject({ canvasX: 524, canvasY: 300, metadata: { displayWidth: 200 } });
  expect(scaled.b.metadata?.layoutBefore).toMatchObject({ x: 212, y: 0, width: 100 });
  const st = useStore.getState(); st.replaceAll([a, b]); st.checkpoint(); st.updateMany(scaled); st.undo();
  expect(useStore.getState().notes.a).toEqual(a);
});

test('putting a selection in a folder moves originals and nested content in one undo step', () => {
  const folder = blankNote('folder', 0, 0, { id: 'f' });
  const child = blankNote('image', 0, 0, { id: 'child', parentId: 'f', mediaUrl: 'idb:keep' });
  const other = blankNote('text', 300, 0, { id: 'text', title: 'keep' });
  const st = useStore.getState(); st.replaceAll([folder, child, other]); st.setUI({ openFolderId: null });
  folderSelection(['f', 'text']);
  const next = useStore.getState(), wrapper = next.selected[0];
  expect(next.notes.f.parentId).toBe(wrapper); expect(next.notes.text.parentId).toBe(wrapper);
  expect(next.notes.child.parentId).toBe('f'); expect(next.notes.child.mediaUrl).toBe('idb:keep');
  next.undo(); expect(useStore.getState().order).toEqual(['f', 'child', 'text']);
});

test('group docking does not depend on member order or which card was grabbed', () => {
  const members = [{ id: 'wide', r: { x: 90, y: 212, w: 120, h: 80 } }, { id: 'portrait', r: { x: 222, y: 212, w: 50, h: 80 } }];
  const target = [{ id: 'target', r: { x: 0, y: 0, w: 300, h: 200 } }];
  const result = adaptiveSnap(members, target, 12, 26)!;
  expect(result.source).toBe('wide'); expect(result.k).toBe(2.5);
  expect(adaptiveSnap([...members].reverse(), target, 12, 26)).toEqual(result);
  expect(result.guide.kind).toBe('dock'); expect(result.guide.x1).toBe(result.guide.x2);
});

test('a dock survives small pointer jitter, releases when pulled away, and does not steal another target', () => {
  const target = [{ id: 'target', r: { x: 0, y: 0, w: 300, h: 200 } }];
  const at = (x: number) => [{ id: 'moving', r: { x, y: 0, w: 120, h: 180 } }];
  const entered = adaptiveSnap(at(315), target, 12, 26)!;
  expect(adaptiveSnap(at(347), target, 12, 26)).toBeNull();
  expect(adaptiveSnap(at(347), target, 12, 26, entered)?.target).toBe('target');
  expect(adaptiveSnap(at(360), target, 12, 26, entered)).toBeNull();
  const rival = { id: 'rival', r: { x: 35, y: 0, w: 300, h: 200 } };
  expect(adaptiveSnap(at(347), [...target, rival], 12, 26, entered)?.target).toBe('target');
});

test('different exposed cards produce different scales, without arbitrary minimum-width rejection', () => {
  const members = [{ id: 'wide', r: { x: 0, y: 212, w: 120, h: 80 } }, { id: 'narrow', r: { x: 132, y: 212, w: 50, h: 80 } }];
  expect(adaptiveSnap(members, [{ id: 'target', r: { x: 132, y: 0, w: 50, h: 200 } }], 12, 26)?.source).toBe('narrow');
  const tiny = adaptiveSnap([{ id: 'moving', r: { x: 312, y: 0, w: 100, h: 500 } }], [{ id: 'target', r: { x: 0, y: 0, w: 300, h: 100 } }], 12, 26)!;
  expect(tiny.k).toBe(0.2); // a legitimate 20px-wide result used to be silently rejected
});

test('the same screen-space approach works at low and high canvas zoom', () => {
  for (const zoom of [0.1, 0.25, 1, 3]) {
    const target = [{ id: 'target', r: { x: 0, y: 0, w: 300 / zoom, h: 200 / zoom } }];
    const moving = [{ id: 'moving', r: { x: 332 / zoom, y: 20 / zoom, w: 120 / zoom, h: 180 / zoom } }];
    expect(adaptiveSnap(moving, target, 12 / zoom, 26 / zoom)?.side).toBe('right');
  }
});
