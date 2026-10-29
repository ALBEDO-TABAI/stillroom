// Capture our app in the same states/sizes as the reference. Usage: ONLY=regex THEMES=dark,light SIZE=1440x900 node capture.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import { STATES as DEMO } from './states.mjs';
import { SIGNED, SIGNED_URL } from './signed_states.mjs';
const signed = !!process.env.SIGNED;
const STATES = signed ? SIGNED : DEMO;
const BASE = process.env.BASE || 'http://127.0.0.1:5410/';
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const themes = (process.env.THEMES || 'dark,light').split(',');
const size = (process.env.SIZE || '1440x900').split('x').map(Number);
const suffix = process.env.SIZE ? '_' + process.env.SIZE : '';
const OUT = new URL('../docs/parity/ours/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome' });
for (const theme of themes) for (const [name, fn] of Object.entries(STATES)) {
  if (only && !only.test(name)) continue;
  const ctx = await b.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(signed ? SIGNED_URL(BASE, theme) : `${BASE}?fixture=demo&theme=${theme}`);
  await p.waitForSelector('[data-card]'); await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  const h = { card: async id => { const bb = await (await p.$(`[data-note-id="${id}"]`)).boundingBox(); return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, bb }; } };
  try { await fn(p, h); } catch (e) { console.log('ERR', name, e.message.split('\n')[0]); }
  await p.waitForTimeout(900);
  const tag = `${signed ? 'u_' : ''}${name}_${theme}${suffix}`;
  if (signed) await p.addStyleTag({ content: 'button[data-bc-pill]:not([aria-label]), button[data-bc-col-pill] { filter: blur(8px); }' });
  await p.screenshot({ path: `${OUT}${tag}.png` });
  const geo = await p.evaluate(() => [...document.querySelectorAll('[data-card],[data-topbar] button,.sr-btn,.sr-row,.sr-editor-window,.sr-user-panel,.sr-play')].map(e => {
    const r = e.getBoundingClientRect();
    const cls = e.className.toString().replace(/\bsr-/g, 'gm-').replace(/ sr-in(--chrome)?| gm-in(--chrome)?/g, '').replace(/gm-win-unpack| gm-clear-all/g, '').trim();
    return { k: e.getAttribute('data-note-id') || e.getAttribute('aria-label') || cls.slice(0, 40) || e.tagName, t: (e.innerText || '').slice(0, 30), r: [r.x, r.y, r.width, r.height].map(v => Math.round(v * 10) / 10) };
  }));
  fs.writeFileSync(`${OUT}${tag}.geo.json`, JSON.stringify(geo));
  const cam = await p.evaluate(() => JSON.stringify(window.__sr.getState().cam));
  console.log('ok', tag, cam);
  await ctx.close();
}
await b.close();
