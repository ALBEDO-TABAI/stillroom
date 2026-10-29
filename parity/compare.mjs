// Side-by-side ref | ours | diff, pixel match % and geometry deltas per state.
// Usage: node compare.mjs [regex]   → docs/parity/sbs/<tag>.png, docs/parity/report.json, docs/parity/REPORT.md
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const REFS = '/workspace/goldmund-research/ref/states/', REFU = '/workspace/goldmund-research/ref/signed/';
const refOf = t => (t.startsWith('u_') ? REFU : REFS);
const ROOT = new URL('../docs/parity/', import.meta.url).pathname;
const OURS = ROOT + 'ours/', SBS = ROOT + 'sbs/';
fs.mkdirSync(SBS, { recursive: true });
const only = process.argv[2] ? new RegExp(process.argv[2]) : null;
const tags = fs.readdirSync(OURS).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)).filter(t => fs.existsSync(refOf(t) + t + '.png') && (!only || only.test(t))).sort();

// Image content differs by design (our own generated pictures). Mask image/video module rects found in either geo.
function masks(geo) { return geo.filter(g => /^\d{10,}$|^923$|^a[146]$/.test(g.k) && !['1783355259111069', '1783357657915456'].includes(g.k)).map(g => g.r); }
const read = f => PNG.sync.read(fs.readFileSync(f));
const prev = fs.existsSync(ROOT + 'report.json') ? JSON.parse(fs.readFileSync(ROOT + 'report.json')) : {};
const report = { ...prev };
for (const t of tags) {
  const REF = refOf(t);
  const a = read(REF + t + '.png'), b = read(OURS + t + '.png');
  const W = Math.min(a.width, b.width), H = Math.min(a.height, b.height);
  const crop = (img) => { const o = new PNG({ width: W, height: H }); PNG.bitblt(img, o, 0, 0, W, H, 0, 0); return o; };
  const A = crop(a), B = crop(b);
  const ga = fs.existsSync(REF + t + '.geo.json') ? JSON.parse(fs.readFileSync(REF + t + '.geo.json')) : [];
  const gb = fs.existsSync(OURS + t + '.geo.json') ? JSON.parse(fs.readFileSync(OURS + t + '.geo.json')) : [];
  // mask: paint both images' media rects with the same grey so only layout/chrome is compared there
  const extra = t.startsWith('slideshow') ? [[W / 2 - 0.4 * H / 1.4994 - 2, H * 0.1 - 2, 0.8 * H / 1.4994 + 4, 0.8 * H + 4]] : [];
  for (const [x, y, w, h] of [...masks(ga), ...masks(gb), ...extra]) for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(W, x + w); xx++) {
    const i = (yy * W + xx) * 4; for (const I of [A, B]) { I.data[i] = 128; I.data[i + 1] = 128; I.data[i + 2] = 128; I.data[i + 3] = 255; }
  }
  // signed-in refs are redacted (handle pill + pictures blurred); mask the handle on both sides too
  if (t.startsWith('u_')) for (const [x, y, w, h] of [...ga, ...gb].filter(g => /gm-btn--ghost/.test(g.k) && !/icon/.test(g.k)).map(g => g.r)) for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(W, x + w); xx++) {
    const i = (yy * W + xx) * 4; for (const I of [A, B]) { I.data[i] = 128; I.data[i + 1] = 128; I.data[i + 2] = 128; I.data[i + 3] = 255; }
  }
  const D = new PNG({ width: W, height: H });
  const bad = pixelmatch(A.data, B.data, D.data, W, H, { threshold: 0.1, alpha: 0.25 });
  const pix = 100 * (1 - bad / (W * H));
  // geometry: match by key + order
  const norm = k => /^gm-|\bgm-/.test(k) ? k.split(/\s+/).filter(x => !/^gm-in(--chrome)?$|^gm-panel$|^gm-shortcuts$/.test(x)).sort().join(' ') : k;
  const by = g => { const m = {}; for (const e of g) (m[norm(e.k)] ??= []).push(e.r); return m; };
  const ma = by(ga), mb = by(gb); let n = 0, sum = 0, within2 = 0, missing = [];
  for (const k of Object.keys(ma)) {
    const ra = ma[k], rb = mb[k] || [];
    ra.forEach((r, i) => {
      const q = rb[i]; if (!q) { missing.push(k); return; }
      const d = Math.max(...r.map((v, j) => Math.abs(v - q[j]))); n++; sum += d; if (d <= 2) within2++;
    });
  }
  const geo = { matched: n, within2px: n ? +(100 * within2 / n).toFixed(1) : null, meanMaxDelta: n ? +(sum / n).toFixed(2) : null, missing: [...new Set(missing)].slice(0, 12) };
  // side by side: ref (media masked grey — no third-party pictures in the repo) | ours | diff
  const S = new PNG({ width: W * 3, height: H });
  PNG.bitblt(A, S, 0, 0, W, H, 0, 0); PNG.bitblt(b, S, 0, 0, W, H, W, 0); PNG.bitblt(D, S, 0, 0, W, H, 2 * W, 0);
  fs.writeFileSync(SBS + t + '.png', PNG.sync.write(S));
  report[t] = { pixel: +pix.toFixed(2), geo };
  console.log(t.padEnd(32), 'pixel', pix.toFixed(2).padStart(6), '%  geo', geo.within2px, '% ≤2px of', n, ' meanΔ', geo.meanMaxDelta, geo.missing.length ? ' missing:' + geo.missing.join(',') : '');
}
fs.writeFileSync(ROOT + 'report.json', JSON.stringify(report, null, 1));
const rows = Object.entries(report).sort().map(([t, r]) => `| ${t} | ${r.pixel} | ${r.geo.within2px ?? '–'} (${r.geo.matched}) | ${r.geo.meanMaxDelta ?? '–'} | [sbs](sbs/${t}.png) |`);
const avg = k => { const v = Object.values(report).map(k).filter(x => x != null); return (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2); };
fs.writeFileSync(ROOT + 'REPORT.md', `# Parity report\n\nReference: public guest canvas of the original (read-only capture). Ours: \`?fixture=demo\`. Image/video module interiors are masked (our own pictures), everything else is compared as-is.\n\nMean pixel match: **${avg(r => r.pixel)}%** · mean geometry ≤2px: **${avg(r => r.geo.within2px)}%**\n\n| state | pixel % | geometry ≤2px % (n) | mean max Δpx | side-by-side |\n|---|---|---|---|---|\n${rows.join('\n')}\n`);
