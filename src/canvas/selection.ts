import { useStore, blankNote, liveIds } from '../store/store';
import type { Note } from '../store/types';
import { rectOf, union, type Rect } from '../lib/geometry';

type SnapItem = { id: string; r: Rect };
export type AdaptiveDock = {
  x: number; y: number; k: number; target: string; source: string; side: string; score: number;
  dragX: number; dragY: number;
  guide: { x1: number; y1: number; x2: number; y2: number; kind: 'dock' };
};

/** One decision owns both the edge marker and the release transform. All exposed group edges participate. */
export function adaptiveSnap(members: SnapItem[], others: SnapItem[], gap: number, radius: number, previous: AdaptiveDock | null = null): AdaptiveDock | null {
  if (!members.length) return null;
  const bounds = union(members.map(m => m.r));
  const candidates: AdaptiveDock[] = [];
  for (const { id: source, r: m } of members) for (const { id: target, r: o } of others) {
    for (const side of ['left', 'right', 'top', 'bottom']) {
      const horizontal = side === 'left' || side === 'right';
      const negative = side === 'left' || side === 'top';
      // Only outward-facing edges can dock; an interior card must not pull the rest through the target.
      const edge = horizontal ? (negative ? m.x + m.w : m.x) : (negative ? m.y + m.h : m.y);
      const outer = horizontal ? (negative ? bounds.x + bounds.w : bounds.x) : (negative ? bounds.y + bounds.h : bounds.y);
      if (Math.abs(edge - outer) > 1) continue;
      const targetEdge = horizontal ? (negative ? o.x : o.x + o.w) : (negative ? o.y : o.y + o.h);
      const landingEdge = targetEdge + (negative ? -gap : gap);
      const distance = Math.abs(edge - landingEdge);
      const held = previous?.target === target && previous.source === source && previous.side === side;
      const reach = radius * (held ? 1.6 : 1);
      const lo = Math.max(horizontal ? m.y : m.x, horizontal ? o.y : o.x);
      const hi = Math.min(horizontal ? m.y + m.h : m.x + m.w, horizontal ? o.y + o.h : o.x + o.w);
      if (distance > reach || hi < lo) continue;
      const k = horizontal ? o.h / m.h : o.w / m.w;
      const memberX = horizontal ? (negative ? o.x - gap - m.w * k : o.x + o.w + gap) : o.x;
      const memberY = horizontal ? o.y : (negative ? o.y - gap - m.h * k : o.y + o.h + gap);
      const mid = (lo + hi) / 2, seam = (targetEdge + landingEdge) / 2, half = radius * 0.45;
      const centreDistance = Math.abs(horizontal ? m.y + m.h / 2 - o.y - o.h / 2 : m.x + m.w / 2 - o.x - o.w / 2);
      candidates.push({ source, target, side, k, score: distance + centreDistance * 0.2,
        x: memberX - (m.x - bounds.x) * k, y: memberY - (m.y - bounds.y) * k,
        dragX: bounds.x + (horizontal ? landingEdge - edge : 0), dragY: bounds.y + (horizontal ? 0 : landingEdge - edge),
        guide: horizontal ? { x1: seam - half, y1: mid, x2: seam + half, y2: mid, kind: 'dock' }
          : { x1: mid, y1: seam - half, x2: mid, y2: seam + half, kind: 'dock' } });
    }
  }
  const held = candidates.find(c => c.target === previous?.target && c.source === previous.source && c.side === previous.side);
  candidates.sort((a, b) => a.score - b.score || a.target.localeCompare(b.target) || a.source.localeCompare(b.source));
  if (held) {
    const adjacent = candidates.find(c => c.target === held.target && c.side === held.side)!;
    return adjacent.score + radius * 0.35 < held.score ? adjacent : held;
  }
  return candidates[0] ?? null;
}

export function scaleSelection(notes: Record<string, Note>, rects: Record<string, Rect>, origin: { x: number; y: number }, destination: { x: number; y: number }, k: number) {
  const patches: Record<string, Partial<Note>> = {};
  for (const [id, r] of Object.entries(rects)) {
    const n = notes[id], m = n.metadata;
    patches[id] = { canvasX: destination.x + (r.x - origin.x) * k, canvasY: destination.y + (r.y - origin.y) * k,
      metadata: { displayWidth: r.w * k, ...(n.type === 'text' ? { titleFontScale: (m.titleFontScale ?? 1) * k, frameH: m.frameH ? m.frameH * k : undefined } : {}), dock: null,
        layoutBefore: m.layoutBefore ?? { x: r.x, y: r.y, width: m.displayWidth, fontScale: m.titleFontScale, frameH: m.frameH } } };
  }
  return patches;
}

/** Animate the rendered change; dragging itself stays directly attached to the pointer. */
export function animateSelection(ids: string[], change: () => void) {
  const elements = [...document.querySelectorAll<HTMLElement>('[data-card]')].filter(el => ids.includes(el.dataset.noteId!)).map(el => el.parentElement!);
  const before = elements.map(el => { const r = el.getBoundingClientRect(); el.getAnimations().forEach(a => a.cancel()); return r; });
  change();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  requestAnimationFrame(() => {
    const z = useStore.getState().cam.z;
    const canvas = elements[0]?.closest<HTMLElement>('[data-canvas]');
    const token = String(performance.now());
    if (canvas) canvas.dataset.settling = token;
    const animations: Animation[] = [];
    for (const [i, el] of elements.entries()) {
      const a = before[i], b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      animations.push(el.animate([{ transform: `translate(${(a.x - b.x) / z}px, ${(a.y - b.y) / z}px) scale(${a.width / b.width}, ${a.height / b.height})` }, { transform: 'none' }],
        { duration: 260, easing: 'cubic-bezier(0.22,1,0.36,1)' }));
    }
    void Promise.allSettled(animations.map(a => a.finished)).then(() => { if (canvas?.dataset.settling === token) delete canvas.dataset.settling; });
  });
}

export function resetSelection(ids: string[]) {
  const st = useStore.getState();
  const patches: Record<string, Partial<Note>> = {};
  for (const id of ids) {
    const b = st.notes[id].metadata.layoutBefore;
    if (b) patches[id] = { canvasX: b.x, canvasY: b.y, metadata: { displayWidth: b.width, titleFontScale: b.fontScale, frameH: b.frameH, layoutBefore: undefined, dock: null } };
  }
  if (!Object.keys(patches).length) return;
  st.checkpoint(); animateSelection(ids, () => st.updateMany(patches));
}

export function folderSelection(ids: string[]) {
  const st = useStore.getState(), visible = liveIds(st);
  const members = ids.filter(id => visible.includes(id));
  if (!members.length) return;
  const box = union(members.map(id => rectOf(st.notes[id], st.sizes)));
  const folder = blankNote('folder', box.x, box.y, { title: 'New Folder', parentId: st.ui.openFolderId });
  st.checkpoint();
  const notes = { ...st.notes, [folder.id]: folder };
  for (const id of members) notes[id] = { ...notes[id], parentId: folder.id, metadata: { ...notes[id].metadata, dock: null } };
  for (const n of Object.values(notes)) {
    const d = n.metadata.dock;
    if (!members.includes(n.id) && d && (members.includes(d.l ?? '') || members.includes(d.t ?? '')))
      notes[n.id] = { ...n, metadata: { ...n.metadata, dock: null } };
  }
  useStore.setState({ notes, order: [...st.order, folder.id], selected: [folder.id] });
  st.setUI({ menu: null, toast: `${members.length} modules moved into New Folder` });
}
