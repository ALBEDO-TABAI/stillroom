import type { Note } from '../store/types';
import { CARD_W, CARD_MIN_H, PACKED_MAX_H, TITLE_FS, LINK_RATIO, CARD_PAD } from './constants';
export type Rect = { x: number; y: number; w: number; h: number };

export const noteWidth = (n: Note) =>
  n.metadata.displayWidth ?? (n.type === 'image' || n.type === 'video' ? 320 : CARD_W);

export const hasBody = (html: string) => !!html && html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
export const isPacked = (n: Note) => n.type === 'text' && (n.metadata.packed ?? hasBody(n.text));

/** Estimate of a module's height in world units, used before the DOM has measured it. */
export function estimateHeight(n: Note): number {
  const w = noteWidth(n);
  switch (n.type) {
    case 'image': case 'video': return Math.round(w * (n.metadata.aspectRatio ?? 0.75));
    case 'link': return Math.round(w * LINK_RATIO);
    case 'folder': return w;
    case 'audio': return 140;
    default: {
      if (n.metadata.frameH) return n.metadata.frameH;
      const fs = TITLE_FS * (n.metadata.titleFontScale ?? 1);
      const lines = Math.max(1, Math.ceil((0.5 * (n.title || ' ').length * fs) / Math.max(1, w - 2 * CARD_PAD)));
      const h = Math.max(CARD_MIN_H, Math.round(lines * fs * 1.2 + 2 * CARD_PAD));
      return isPacked(n) ? Math.min(PACKED_MAX_H, h + 60) : h;
    }
  }
}

export const rectOf = (n: Note, sizes: Record<string, { w: number; h: number }>): Rect => {
  const s = sizes[n.id];
  return { x: n.canvasX, y: n.canvasY, w: s?.w ?? noteWidth(n), h: s?.h ?? estimateHeight(n) };
};
export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const union = (rs: Rect[]): Rect => {
  const x = Math.min(...rs.map(r => r.x)), y = Math.min(...rs.map(r => r.y));
  const r = Math.max(...rs.map(r => r.x + r.w)), b = Math.max(...rs.map(r => r.y + r.h));
  return { x, y, w: r - x, h: b - y };
};
/** Gap between two rectangles (0 when touching or overlapping). */
export function rectGap(a: Rect, b: Rect) {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return Math.hypot(dx, dy);
}
