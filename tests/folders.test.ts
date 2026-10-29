import { beforeEach, expect, test, vi } from 'vitest';
import { useStore, blankNote, liveIds } from '../src/store/store';
import { openFolder, moveOut } from '../src/canvas/folders';

beforeEach(() => {
  vi.stubGlobal('innerWidth', 1440); vi.stubGlobal('innerHeight', 900);
  const folder = blankNote('folder', 1000, 500, { id: 'folder' });
  const child = blankNote('text', -2000, -1000, { id: 'child', parentId: 'folder', title: 'Keep me' });
  const sibling = blankNote('image', -1700, -1000, { id: 'sibling', parentId: 'folder', mediaUrl: 'idb:picture', metadata: { dock: { l: 'child' } } });
  useStore.getState().replaceAll([folder, child, sibling], { x: 12, y: 34, z: 0.7 });
  useStore.getState().setUI({ openFolderId: null, menu: null });
});

test('enter frames distant contents, clears selection, and returning restores the view', () => {
  const st = useStore.getState(); st.select(['folder']);
  openFolder('folder');
  const inside = useStore.getState();
  expect(inside.selected).toEqual([]);
  expect(liveIds(inside)).toEqual(['child', 'sibling']);
  const x = inside.notes.child.canvasX * inside.cam.z + inside.cam.x;
  expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1440);
  openFolder(null);
  expect(useStore.getState().cam).toEqual({ x: 12, y: 34, z: 0.7 });
});

test('moving out keeps identity and media, clears cross-folder connections, and is undoable', () => {
  useStore.getState().add(blankNote('image', 1284, 500, { id: 'obstacle' }));
  openFolder('folder'); moveOut(['child']);
  let st = useStore.getState();
  expect(st.ui.openFolderId).toBeNull();
  expect(st.notes.child.parentId).toBeNull();
  expect(st.notes.child.title).toBe('Keep me');
  expect(st.notes.child.canvasX).toBeGreaterThan(1284 + 320);
  expect(st.notes.sibling.metadata.dock).toBeNull();
  expect(st.notes.sibling.mediaUrl).toBe('idb:picture');
  st.undo(); st = useStore.getState();
  expect(st.notes.child.parentId).toBe('folder');
  expect(st.notes.sibling.metadata.dock).toEqual({ l: 'child' });
  expect(st.selected).toEqual([]);
  st.redo(); expect(useStore.getState().notes.child.parentId).toBeNull();
});

test('multiple items move one level up without losing relative layout', () => {
  const st = useStore.getState();
  st.add(blankNote('folder', 0, 0, { id: 'outer' }));
  st.update('folder', { parentId: 'outer' });
  openFolder('folder'); moveOut(['child', 'sibling']);
  const after = useStore.getState();
  expect(after.ui.openFolderId).toBe('outer');
  expect(after.notes.child.parentId).toBe('outer');
  expect(after.notes.sibling.parentId).toBe('outer');
  expect(after.notes.sibling.canvasX - after.notes.child.canvasX).toBe(300);
  expect(after.notes.sibling.mediaUrl).toBe('idb:picture');
  after.undo(); expect(useStore.getState().notes.child.parentId).toBe('folder');
});
