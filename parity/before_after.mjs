// Before/after shots for the round-5 audit fixes. BEFORE=http://127.0.0.1:5411/ (old build), AFTER=dev server.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { PNG } from 'pngjs';
const B = process.env.BEFORE || 'http://127.0.0.1:5411/', A = process.env.AFTER || 'http://127.0.0.1:5410/';
const OUT = new URL('../docs/img/before-after/', import.meta.url).pathname;
const br = await chromium.launch({ executablePath: process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome' });
async function shot(base, scenario) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); await p.goto(base + '?fixture=account&theme=dark'); await p.waitForSelector('[data-card]'); await p.waitForTimeout(600);
  await scenario(p); const buf = await p.screenshot(); await ctx.close(); return buf;
}
const drop20 = async p => {
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d');
    const files = [];
    for (let i = 0; i < 20; i++) { g.fillStyle = `hsl(${i * 18},45%,55%)`; g.fillRect(0, 0, 400, 300); const b = await new Promise(r => c.toBlob(r, 'image/png')); files.push(new File([b], `p${i}.png`, { type: 'image/png' })); }
    const dt = new DataTransfer(); files.forEach(f => dt.items.add(f));
    const t = document.elementFromPoint(640, 400); for (const ty of ['dragenter', 'dragover', 'drop']) t.dispatchEvent(new DragEvent(ty, { bubbles: true, cancelable: true, clientX: 640, clientY: 400, dataTransfer: dt }));
  });
  await p.waitForTimeout(2500);
  // zoom out around the drop so the whole result fits (same camera for both builds)
  await p.evaluate(() => { const st = window.__sr.getState(), c = st.cam, z = 0.16; const w = { x: (640 - c.x) / c.z, y: (400 - c.y) / c.z };
    window.__sr.setState({ cam: { x: 640 - w.x * z - 0, y: 400 - w.y * z, z }, camAnim: 0 }); st.select([]); });
  await p.waitForTimeout(900);
};
const rich = async p => {
  await p.mouse.move(900, 300);
  await p.evaluate(() => { const dt = new DataTransfer(); dt.setData('text/plain', 'Plan\nClay model\nLight test\nDone'); dt.setData('text/html', '<h2>Plan</h2><ul><li><b>Clay</b> model</li><li>Light test</li></ul><script>alert(1)</script><p>Done</p>');
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
  await p.waitForTimeout(800);
};
const tab = async p => { await p.mouse.click(5, 400); for (let i = 0; i < 3; i++) await p.keyboard.press('Tab'); await p.waitForTimeout(300); };
function sbs(a, b, file) {
  const L = PNG.sync.read(a), R = PNG.sync.read(b), gap = 16, o = new PNG({ width: L.width + R.width + gap, height: Math.max(L.height, R.height) });
  o.data.fill(255); PNG.bitblt(L, o, 0, 0, L.width, L.height, 0, 0); PNG.bitblt(R, o, 0, 0, R.width, R.height, L.width + gap, 0);
  fs.writeFileSync(OUT + file, PNG.sync.write(o));
}
for (const [name, sc] of [['drop20', drop20], ['rich_paste', rich], ['tab_focus', tab]]) {
  sbs(await shot(B, sc), await shot(A, sc), `${name}_before_after.png`); console.log('wrote', name);
}
await br.close();
