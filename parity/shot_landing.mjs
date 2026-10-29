// Screenshots of the landing story steps (docs). Usage: node parity/shot_landing.mjs
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:5410/#/welcome'); await p.waitForTimeout(2200);
for (const s of [0, 1, 2, 3, 4, 5]) {
  if (s) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(1300); }
  await p.screenshot({ path: `docs/img/landing_step${s}.png` });
}
await b.close();
