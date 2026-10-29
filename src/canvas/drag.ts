import { useStore, liveIds } from '../store/store';
import type { Rect } from '../lib/geometry';
import { rectOf } from '../lib/geometry';

export type Guide = { x1: number; y1: number; x2: number; y2: number };
export const useGuides = { lines: [] as Guide[], listeners: new Set<() => void>() };
export function setGuides(g: Guide[]) { useGuides.lines = g; useGuides.listeners.forEach(f => f()); }

/** Magnetic snap: pull the dragged rectangle onto a neighbour's edge (gap apart) or into alignment. */
export function snap(r: Rect, others: Rect[], gap: number, radius: number, smart: boolean) {
  let bx: { d: number; v: number; g?: Guide } | null = null, by: { d: number; v: number; g?: Guide } | null = null;
  const overlapY = (o: Rect) => r.y < o.y + o.h + radius && r.y + r.h > o.y - radius;
  const overlapX = (o: Rect) => r.x < o.x + o.w + radius && r.x + r.w > o.x - radius;
  for (const o of others) {
    const cx: [number, boolean][] = [];
    if (overlapY(o)) cx.push([o.x + o.w + gap, false], [o.x - r.w - gap, false]);
    cx.push([o.x, true], [o.x + o.w - r.w, true]);
    for (const [v, align] of cx) {
      const d = Math.abs(v - r.x);
      if (d <= radius && (!bx || d < bx.d)) bx = { d, v, g: align && smart ? { x1: align && v === o.x ? o.x : o.x + o.w, y1: Math.min(o.y, r.y) - 16, x2: v === o.x ? o.x : o.x + o.w, y2: Math.max(o.y + o.h, r.y + r.h) + 16 } : undefined };
    }
    const cy: [number, boolean][] = [];
    if (overlapX(o)) cy.push([o.y + o.h + gap, false], [o.y - r.h - gap, false]);
    cy.push([o.y, true], [o.y + o.h - r.h, true]);
    for (const [v, align] of cy) {
      const d = Math.abs(v - r.y);
      if (d <= radius && (!by || d < by.d)) by = { d, v, g: align && smart ? { x1: Math.min(o.x, r.x) - 16, y1: v === o.y ? o.y : o.y + o.h, x2: Math.max(o.x + o.w, r.x + r.w) + 16, y2: v === o.y ? o.y : o.y + o.h } : undefined };
    }
  }
  const guides: Guide[] = [];
  if (bx?.g) guides.push(bx.g); if (by?.g) guides.push(by.g);
  return { x: bx ? bx.v : r.x, y: by ? by.v : r.y, guides };
}

/** After a move, record which neighbour each module is docked to (left / top), gap apart. */
export function computeDocks(ids: string[]) {
  const st = useStore.getState();
  const gap = st.prefs.gap;
  const live = liveIds(st);
  const patches: Record<string, any> = {};
  for (const id of ids) {
    const r = rectOf(st.notes[id], st.sizes);
    let l: string | undefined, t: string | undefined;
    for (const oid of live) {
      if (oid === id) continue;
      const o = rectOf(st.notes[oid], st.sizes);
      if (Math.abs(o.x + o.w + gap - r.x) <= 1 && r.y < o.y + o.h && r.y + r.h > o.y) l = oid;
      if (Math.abs(o.y + o.h + gap - r.y) <= 1 && r.x < o.x + o.w && r.x + r.w > o.x) t = oid;
    }
    patches[id] = { metadata: { dock: l || t ? { ...(l ? { l } : {}), ...(t ? { t } : {}) } : null } };
  }
  st.updateMany(patches);
}
