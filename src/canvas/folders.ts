import { useStore, liveIds } from '../store/store';
import { rectOf, union, intersects } from '../lib/geometry';
import { frameRect } from './camera';

/** All folder entrances share selection cleanup and per-canvas framing. */
export function openFolder(id: string | null) {
  const st = useStore.getState();
  if (id === st.ui.openFolderId) return;
  if (id && (!st.notes[id] || st.notes[id].deletedAt || st.notes[id].type !== 'folder')) return;
  useStore.setState({ folderCams: { ...st.folderCams, [st.ui.openFolderId ?? 'root']: st.cam } });
  st.select([]); st.setHover(null);
  st.setUI({ openFolderId: id, menu: null, editingId: null, editorId: null, userMenu: false, binOpen: false, search: '' });
  const remembered = st.folderCams[id ?? 'root'];
  if (remembered) { st.setCam(remembered); return; }
  const ids = liveIds(st, id);
  if (ids.length) frameRect(union(ids.map(i => rectOf(st.notes[i], st.sizes))), { pad: 120, maxZ: 1, anim: 0 });
  else st.setCam({ x: innerWidth / 2, y: innerHeight / 2, z: 1 });
}

/** Move the original modules, retaining their contents and relative layout. */
export function moveOut(ids: string[]) {
  const st = useStore.getState();
  const folder = st.ui.openFolderId && st.notes[st.ui.openFolderId];
  if (!folder) return;
  const moving = ids.filter(id => st.notes[id] && !st.notes[id].deletedAt && st.notes[id].parentId === folder.id);
  if (!moving.length) return;
  const group = union(moving.map(id => rectOf(st.notes[id], st.sizes)));
  const anchor = rectOf(folder, st.sizes);
  const placement = { x: anchor.x + anchor.w + 24, y: anchor.y, w: group.w, h: group.h };
  const obstacles = liveIds(st, folder.parentId).map(id => rectOf(st.notes[id], st.sizes));
  let hit;
  while ((hit = obstacles.find(r => intersects(placement, r)))) placement.x = hit.x + hit.w + 24;
  st.checkpoint();
  const patches: Parameters<typeof st.updateMany>[0] = {};
  for (const id of moving) {
    const n = st.notes[id];
    patches[id] = { parentId: folder.parentId, canvasX: n.canvasX + placement.x - group.x,
      canvasY: n.canvasY + placement.y - group.y, metadata: { dock: null } };
  }
  // Connections cannot span two canvases.
  for (const n of Object.values(st.notes)) {
    const d = n.metadata.dock;
    if (!moving.includes(n.id) && d && (moving.includes(d.l ?? '') || moving.includes(d.t ?? '')))
      patches[n.id] = { metadata: { dock: null } };
  }
  st.updateMany(patches);
  openFolder(folder.parentId);
  st.select(moving);
  const next = useStore.getState();
  frameRect(union([anchor, ...moving.map(id => rectOf(next.notes[id], next.sizes))]), { pad: 120, maxZ: 1, anim: 0 });
  st.setUI({ toast: `Moved ${moving.length} module${moving.length === 1 ? '' : 's'} out of the folder` });
}
