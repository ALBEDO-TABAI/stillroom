import { animateSelection } from '../canvas/selection';
import type { Note } from '../store/types';
import { useStore } from '../store/store';
import { rectOf, union } from './geometry';
import { computeDocks } from '../canvas/drag';

/** P — gallery: rows of equal height, gap apart, keeping each module's proportion. */
export function galleryLayout(ids: string[]) {
  const st = useStore.getState(); if (ids.length < 2) return;
  const gap = st.prefs.gap; const rs = ids.map(id => ({ id, r: rectOf(st.notes[id], st.sizes) }));
  const box = union(rs.map(x => x.r));
  const target = Math.max(box.w, Math.sqrt(rs.reduce((a, x) => a + x.r.w * x.r.h, 0)) * 1.4);
  const rowH = Math.round(Math.max(120, Math.min(300, rs.reduce((a, x) => a + x.r.h, 0) / rs.length)));
  rs.sort((a, b) => a.r.y - b.r.y || a.r.x - b.r.x);
  st.checkpoint();
  const patches: Record<string, any> = {};
  let x = box.x, y = box.y, row: typeof rs = [];
  const flush = () => { x = box.x; y += rowH + gap; row = []; };
  for (const it of rs) {
    const n = st.notes[it.id]; const scaled = n.type === 'image' || n.type === 'video';
    const w = scaled ? Math.round(rowH / (n.metadata.aspectRatio ?? 1)) : it.r.w;
    if (x > box.x && x + w > box.x + target) flush();
    patches[it.id] = { canvasX: Math.round(x), canvasY: Math.round(y), ...(scaled ? { metadata: { displayWidth: w } } : {}) };
    x += w + gap; row.push(it);
  }
  applyLayout(ids, patches); requestAnimationFrame(() => computeDocks(ids));
}

/** L — organic: a masonry of columns, shortest column first. */
export function organicLayout(ids: string[]) {
  const st = useStore.getState(); if (ids.length < 2) return;
  const gap = st.prefs.gap; const rs = ids.map(id => ({ id, r: rectOf(st.notes[id], st.sizes) }));
  const box = union(rs.map(x => x.r));
  const cols = Math.max(2, Math.round(Math.sqrt(rs.length)));
  const colW = Math.max(...rs.map(x => x.r.w));
  const hs = Array(cols).fill(box.y);
  st.checkpoint();
  const patches: Record<string, any> = {};
  rs.sort((a, b) => b.r.h - a.r.h);
  for (const it of rs) {
    const c = hs.indexOf(Math.min(...hs));
    patches[it.id] = { canvasX: Math.round(box.x + c * (colW + gap) + (colW - it.r.w) / 2), canvasY: Math.round(hs[c]) };
    hs[c] += it.r.h + gap;
  }
  applyLayout(ids, patches); requestAnimationFrame(() => computeDocks(ids));
}

/** R — scatter: loosen the selection into open space around its centre. */
export function scatter(ids: string[]) {
  const st = useStore.getState(); if (ids.length < 2) return;
  const rs = ids.map(id => ({ id, r: rectOf(st.notes[id], st.sizes) }));
  const box = union(rs.map(x => x.r)); const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const R = Math.sqrt(rs.reduce((a, x) => a + x.r.w * x.r.h, 0)) * 0.9;
  st.checkpoint();
  const patches: Record<string, any> = {};
  rs.forEach((it, i) => {
    const a = i * 2.399963 + Math.random() * 0.6, d = R * Math.sqrt((i + 0.5) / rs.length) * (0.8 + Math.random() * 0.5);
    patches[it.id] = { canvasX: Math.round(cx + Math.cos(a) * d - it.r.w / 2), canvasY: Math.round(cy + Math.sin(a) * d - it.r.h / 2), metadata: { dock: null } };
  });
  applyLayout(ids, patches);
}

function applyLayout(ids: string[], patches: Record<string, Partial<Note>>) {
  const st = useStore.getState();
  for (const id of ids) {
    const n = st.notes[id], m = n.metadata;
    patches[id].metadata = { ...patches[id].metadata, layoutBefore: m.layoutBefore ?? { x: n.canvasX, y: n.canvasY, width: m.displayWidth, fontScale: m.titleFontScale, frameH: m.frameH } };
  }
  animateSelection(ids, () => st.updateMany(patches));
}
