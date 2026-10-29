import { BTN_H, NECK_R } from './constants';
/** One glass shape behind a row of pills: caps r = H/2, joined by concave necks of radius NECK_R. */
export function pillRowPath(widths: number[], gap: number, H = BTN_H, nr = NECK_R): string {
  const r = H / 2;
  const xs: number[] = []; let x = 0;
  for (const w of widths) { xs.push(x); x += w + gap; }
  const end = xs[xs.length - 1] + widths[widths.length - 1];
  const j = widths.slice(0, -1).map((w, i) => {
    const c1 = xs[i] + w - r, c2 = xs[i + 1] + r;
    const m = (xs[i] + w + xs[i + 1]) / 2;
    const dx = m - c1, D = r + nr, dy = Math.sqrt(Math.max(0, D * D - dx * dx));
    const k = r / D;
    return { c1, c2, ax: c1 + dx * k, bx: c2 - dx * k, ay: r - dy * k };
  });
  let d = `M 0 ${r} A ${r} ${r} 0 0 1 ${r} 0`;
  for (const q of j) d += ` L ${q.c1} 0 A ${r} ${r} 0 0 1 ${q.ax} ${q.ay} A ${nr} ${nr} 0 0 0 ${q.bx} ${q.ay} A ${r} ${r} 0 0 1 ${q.c2} 0`;
  d += ` L ${end - r} 0 A ${r} ${r} 0 0 1 ${end} ${r} A ${r} ${r} 0 0 1 ${end - r} ${H}`;
  for (const q of [...j].reverse()) d += ` L ${q.c2} ${H} A ${r} ${r} 0 0 1 ${q.bx} ${H - q.ay} A ${nr} ${nr} 0 0 0 ${q.ax} ${H - q.ay} A ${r} ${r} 0 0 1 ${q.c1} ${H}`;
  d += ` L ${r} ${H} A ${r} ${r} 0 0 1 0 ${r} Z`;
  return d;
}
