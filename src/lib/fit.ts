import type { Cam, Note } from '../store/types';
import { ZOOM_MAX } from './constants';
/** First-load framing: fit every module, zoom in a touch, and centre on the hero headline. */
export function fitCamera(notes: Note[], W: number, H: number, opts: { pad?: number; zoomIn?: number; centerHero?: boolean } = {}): Cam {
  const pad = opts.pad ?? 80, zoomIn = opts.zoomIn ?? 1;
  if (!notes.length) return { x: Math.round(W / 2), y: Math.round(H / 2), z: 1 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of notes) {
    const w = n.type === 'image' ? n.metadata.displayWidth || 260 : 260;
    const h = n.type === 'image' ? Math.round(w * (n.metadata.aspectRatio || 1)) : 140;
    x0 = Math.min(x0, n.canvasX); y0 = Math.min(y0, n.canvasY);
    x1 = Math.max(x1, n.canvasX + w); y1 = Math.max(y1, n.canvasY + h);
  }
  const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
  const z = Math.min(Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh, 1) * zoomIn, 1, ZOOM_MAX);
  let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (opts.centerHero) {
    let hero: Note | null = null;
    for (const n of notes) {
      if (n.type !== 'text' || (n.text && n.text.replace(/<[^>]+>/g, '').trim())) continue;
      if (!hero || (n.metadata.titleFontScale ?? 1) > (hero.metadata.titleFontScale ?? 1)) hero = n;
    }
    if (hero) {
      const w = hero.metadata.displayWidth || 260, fs = 18 * (hero.metadata.titleFontScale || 1);
      const lines = Math.ceil((0.5 * (hero.title || '').length * fs) / Math.max(1, w - 34));
      const h = Math.max(66, Math.round(lines * fs * 1.2 + 34));
      cx = hero.canvasX + w / 2; cy = hero.canvasY + h / 2;
    }
  }
  return { x: Math.round(W / 2 - cx * z), y: Math.round(H / 2 - cy * z), z };
}
