import type { Rect } from '../lib/geometry';
import { rectGap } from '../lib/geometry';
import { CLUSTER_TOL, CLUSTER_PAD, CLUSTER_R } from '../lib/constants';

/** Group modules whose rectangles sit within CLUSTER_TOL of each other (union-find). */
export function clusters(items: { id: string; r: Rect }[], tol = CLUSTER_TOL): string[][] {
  const p = items.map((_, i) => i);
  const find = (i: number): number => (p[i] === i ? i : (p[i] = find(p[i])));
  // sweep along x: only pairs whose x-ranges come within tol can touch (keeps 1000 modules well under a frame)
  const byX = items.map((_, i) => i).sort((a, b) => items[a].r.x - items[b].r.x);
  for (let a = 0; a < byX.length; a++) {
    const i = byX[a], ri = items[i].r, reach = ri.x + ri.w + tol;
    for (let b = a + 1; b < byX.length && items[byX[b]].r.x <= reach; b++) {
      const j = byX[b]; if (rectGap(ri, items[j].r) <= tol) p[find(i)] = find(j);
    }
  }
  const g = new Map<number, string[]>();
  items.forEach((it, i) => { const k = find(i); g.set(k, [...(g.get(k) || []), it.id]); });
  return [...g.values()];
}

/** Outline of a union of rectangles: outset, trace the rectilinear boundary, fillet every corner. */
export function silhouettePath(rects: Rect[], pad = CLUSTER_PAD, R = CLUSTER_R): string {
  const rs = rects.map(r => ({ x0: Math.round(r.x - pad), y0: Math.round(r.y - pad), x1: Math.round(r.x + r.w + pad), y1: Math.round(r.y + r.h + pad) }));
  const xs = [...new Set(rs.flatMap(r => [r.x0, r.x1]))].sort((a, b) => a - b);
  const ys = [...new Set(rs.flatMap(r => [r.y0, r.y1]))].sort((a, b) => a - b);
  const W = xs.length - 1, H = ys.length - 1;
  // Occupancy grid over the compressed coordinates, filled once per rect (was a scan of every rect per cell,
  // which made a 500-module cluster take seconds to outline).
  const xi = new Map(xs.map((v, i) => [v, i])), yi = new Map(ys.map((v, i) => [v, i]));
  const grid = new Uint8Array(Math.max(0, W) * Math.max(0, H));
  for (const r of rs) for (let j = yi.get(r.y0)!, j1 = yi.get(r.y1)!; j < j1; j++) grid.fill(1, j * W + xi.get(r.x0)!, j * W + xi.get(r.x1)!);
  const fill = (i: number, j: number) => i >= 0 && j >= 0 && i < W && j < H && grid[j * W + i] === 1;
  // directed boundary edges, clockwise (inside on the right in screen coords)
  const edges = new Map<string, [number, number]>();
  const key = (x: number, y: number) => `${x},${y}`;
  for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) {
    if (!fill(i, j)) continue;
    if (!fill(i, j - 1)) edges.set(key(xs[i], ys[j]), [xs[i + 1], ys[j]]);
    if (!fill(i + 1, j)) edges.set(key(xs[i + 1], ys[j]), [xs[i + 1], ys[j + 1]]);
    if (!fill(i, j + 1)) edges.set(key(xs[i + 1], ys[j + 1]), [xs[i], ys[j + 1]]);
    if (!fill(i - 1, j)) edges.set(key(xs[i], ys[j + 1]), [xs[i], ys[j]]);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const start of edges.keys()) {
    if (seen.has(start)) continue;
    // walk the loop
    let pts: [number, number][] = [];
    let k = start;
    while (!seen.has(k)) {
      seen.add(k);
      const [x, y] = k.split(',').map(Number);
      pts.push([x, y]);
      const nx = edges.get(k); if (!nx) break;
      k = key(nx[0], nx[1]);
    }
    // drop collinear points
    pts = pts.filter((p, i) => {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
      return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
    });
    if (pts.length < 3) continue;
    const n = pts.length;
    const seg: string[] = [];
    const f = (v: number) => v.toFixed(1);
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 1 + n) % n], p = pts[i], b = pts[(i + 1) % n];
      const l1 = Math.hypot(p[0] - a[0], p[1] - a[1]), l2 = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const r = Math.min(R, l1 / 2, l2 / 2);
      const u1 = [(p[0] - a[0]) / l1, (p[1] - a[1]) / l1], u2 = [(b[0] - p[0]) / l2, (b[1] - p[1]) / l2];
      const s = [p[0] - u1[0] * r, p[1] - u1[1] * r], e = [p[0] + u2[0] * r, p[1] + u2[1] * r];
      const cross = u1[0] * u2[1] - u1[1] * u2[0];
      seg.push(`${i === 0 ? 'M' : 'L'}${f(s[0])},${f(s[1])}`);
      if (r >= 1) seg.push(`A${f(r)},${f(r)} 0 0 ${cross > 0 ? 1 : 0} ${f(e[0])},${f(e[1])}`);
      else seg.push(`L${f(e[0])},${f(e[1])}`);
    }
    out.push(seg.join('') + 'Z');
  }
  return out.join('');
}
