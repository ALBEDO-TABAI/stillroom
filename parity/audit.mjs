// Product audit probes (not pass/fail parity): perf, CJK/IME, undo, a11y, windows, recovery, offline.
// Usage: node parity/audit.mjs  → docs/audit/probes.json (+ screenshots in docs/audit/)
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://127.0.0.1:5410/';
const OUT = new URL('../docs/audit/', import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome' });
const R = {};
const page = async (vp = { width: 1440, height: 900 }, opts = {}) => { const c = await b.newContext({ viewport: vp, ...opts }); const p = await c.newPage(); p.on('pageerror', e => (R.pageErrors ??= []).push(e.message.slice(0, 160))); return p; };
const S = p => p.evaluate(() => { const s = window.__sr.getState(); return JSON.parse(JSON.stringify({ notes: s.notes, ui: s.ui, selected: s.selected, cam: s.cam })); });
const fps = (p, ms, act) => p.evaluate(async ([ms, act]) => {
  let f = 0, worst = 0, last = performance.now(); const t0 = last; let run = true;
  const tick = t => { f++; worst = Math.max(worst, t - last); last = t; if (run) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  const vp = document.querySelector('.sr-app');
  while (performance.now() - t0 < ms) { if (act === 'pan') vp.dispatchEvent(new WheelEvent('wheel', { deltaX: 14, deltaY: 6, bubbles: true, clientX: 700, clientY: 400 })); else if (act === 'zoom') vp.dispatchEvent(new WheelEvent('wheel', { deltaY: 3, ctrlKey: true, bubbles: true, clientX: 700, clientY: 400 })); await new Promise(r => setTimeout(r, 16)); }
  run = false; return { fps: +(f / (ms / 1000)).toFixed(1), worstFrameMs: +worst.toFixed(1) };
}, [ms, act]);
const step = async (name, fn) => { try { R[name] = await fn(); } catch (e) { R[name] = { error: e.message.split('\n')[0] }; } console.log(name, JSON.stringify(R[name]).slice(0, 300)); };

for (const n of [100, 500, 1000]) await step(`perf_${n}`, async () => {
  const p = await page(); const t0 = Date.now();
  await p.goto(`${BASE}?fixture=stress&n=${n}&theme=dark`); await p.waitForFunction(n => document.querySelectorAll('[data-card]').length >= Math.min(n, 1), n, { timeout: 60000 });
  const load = Date.now() - t0; await p.waitForTimeout(800);
  const cards = await p.evaluate(() => document.querySelectorAll('[data-card]').length);
  const pan = await fps(p, 2000, 'pan'); const zoom = await fps(p, 2000, 'zoom');
  await p.keyboard.press('Control+a'); const t1 = Date.now(); await p.keyboard.press('KeyP'); await p.waitForTimeout(50); const layoutMs = Date.now() - t1;
  if (n === 500) await p.screenshot({ path: OUT + 'stress_500.png' });
  await p.context().close(); return { loadMs: load, domCards: cards, pan, zoom, layoutMs };
});

await step('cjk_ime', async () => {
  const p = await page(); await p.goto(`${BASE}?fixture=account&theme=dark`); await p.waitForSelector('[data-card]');
  await p.mouse.click(1250, 120, { button: 'right' }); await p.click('button[title="Text"]'); await p.waitForTimeout(250);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.imeSetComposition', { text: 'ni', selectionStart: 2, selectionEnd: 2 });
  await cdp.send('Input.imeSetComposition', { text: '你好', selectionStart: 2, selectionEnd: 2 });
  // Enter while composing (keyCode 229) must only confirm the candidate
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 229 });
  await cdp.send('Input.insertText', { text: '你好' });
  const s1 = await S(p); const id = s1.ui.editingId;
  const stillTitle = await p.evaluate(() => document.activeElement?.getAttribute('data-note-title'));
  await p.keyboard.type('世界。日本語の文章も'); await p.keyboard.press('Enter'); await p.keyboard.type('正文第一行，中文标点“引号”与长长长长长长长长长长长长长长长长长长长长长长长长长长的词。'); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  const n = (await S(p)).notes[id];
  await p.screenshot({ path: OUT + 'cjk_text.png', clip: { x: 1000, y: 40, width: 440, height: 260 } });
  // search in CJK
  await p.click('.sr-search input'); await p.keyboard.type('世界'); await p.waitForTimeout(300);
  const hits = await p.evaluate(() => document.querySelectorAll('.sr-search-results button, .sr-search-item').length);
  await p.context().close();
  return { titleAfterImeEnter: stillTitle === 'true', title: n?.title, body: n?.text?.slice(0, 80), searchHits: hits };
});

await step('undo_title_edit', async () => {
  const p = await page(); await p.goto(`${BASE}?fixture=account&theme=dark`); await p.waitForSelector('[data-card]');
  const t0 = (await S(p)).notes.a3.title;
  const r = await (await p.$('[data-note-id="a3"]')).boundingBox(); await p.mouse.dblclick(r.x + r.width / 2, r.y + r.height / 2); await p.waitForTimeout(200);
  await p.keyboard.press('End'); await p.keyboard.type(' EDIT'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const t1 = (await S(p)).notes.a3.title;
  await p.keyboard.press('Control+z'); await p.waitForTimeout(150); const t2 = (await S(p)).notes.a3.title;
  await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(150); const t3 = (await S(p)).notes.a3.title;
  await p.context().close(); return { before: t0, edited: t1, afterUndo: t2, afterRedo: t3, ok: t2 === t0 && t3 === t1 };
});

await step('paste_in_folder', async () => {
  const p = await page(); await p.goto(`${BASE}?fixture=account&theme=dark`); await p.waitForSelector('[data-card]');
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const r = await (await p.$('[data-note-id="a3"]')).boundingBox(); await p.mouse.click(r.x + 20, r.y + 20); await p.keyboard.press('Control+c');
  await p.click('button[data-bc-pill]'); await p.waitForTimeout(200); await p.click('button[data-bc-col-pill]'); await p.waitForTimeout(300);
  await p.keyboard.press('Control+v'); await p.waitForTimeout(300);
  const s = await S(p); const copies = Object.values(s.notes).filter(n => n.title === s.notes.a3.title && n.id !== 'a3');
  const visible = await p.evaluate(() => document.querySelectorAll('[data-card]').length);
  await p.context().close(); return { copyParent: copies.map(c => c.parentId), visibleInFolder: visible, ok: copies.length === 1 && copies[0].parentId === 'a2' && visible === 1 };
});

await step('rich_paste', async () => {
  const p = await page(); await p.goto(`${BASE}?fixture=account&theme=dark`); await p.waitForSelector('[data-card]');
  await p.evaluate(() => { const dt = new DataTransfer(); dt.setData('text/html', '<h2>Plan</h2><ul><li><b>Clay</b> model</li><li>Light test</li></ul><script>alert(1)</script><p onclick="x()">Done</p>'); dt.setData('text/plain', 'Plan\nClay model\nLight test\nDone'); document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })); });
  await p.waitForTimeout(250);
  const n = Object.values((await S(p)).notes).find(n => /Plan/.test(n.title));
  await p.context().close(); return { title: n?.title, text: n?.text, keptList: /<li>/.test(n?.text ?? ''), noScript: !/script|onclick/.test(n?.text ?? '') };
});

await step('keyboard_tab_order', async () => {
  const p = await page(); await p.goto(`${BASE}?fixture=account&theme=dark`); await p.waitForSelector('[data-card]');
  const seen = [];
  for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab'); seen.push(await p.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.textContent?.trim().slice(0, 20) || a.tagName) : null; })); }
  const sel = (await S(p)).selected;
  await p.context().close(); return { focused: seen, selectedAfterTabs: sel };
});

await step('aria_unlabelled', async () => {
  const p = await page(); await p.goto(`${BASE}?fixture=account&theme=dark`); await p.waitForSelector('[data-card]');
  await p.click('button[aria-label="User menu"]'); await p.waitForTimeout(300);
  const r = await p.evaluate(() => [...document.querySelectorAll('button,a,input,[role=button]')].filter(e => !(e.getAttribute('aria-label') || e.title || e.textContent.trim() || e.getAttribute('placeholder'))).map(e => e.outerHTML.slice(0, 90)));
  const focusRing = await p.evaluate(() => { const b = document.querySelector('button[aria-label="Bin"]'); b.focus(); const cs = getComputedStyle(b); return cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.boxShadow.slice(0, 40); });
  await p.context().close(); return { unlabelled: r, binFocusStyle: focusRing };
});

for (const [w, h] of [[800, 500], [1024, 640], [2560, 1440], [390, 844]]) await step(`window_${w}x${h}`, async () => {
  const p = await page({ width: w, height: h }); await p.goto(`${BASE}?fixture=account&theme=dark`); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + `window_${w}x${h}.png` });
  const over = await p.evaluate(() => { const els = [...document.querySelectorAll('[data-topbar] button, .sr-search')]; const rs = els.map(e => e.getBoundingClientRect()); let o = 0; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], b = rs[j]; if (a.width && b.width && a.x < b.right - 1 && b.x < a.right - 1 && a.y < b.bottom - 1 && b.y < a.bottom - 1) o++; } return { overlaps: o, offscreen: rs.filter(r => r.right > innerWidth + 1 || r.x < -1).length }; });
  await p.context().close(); return over;
});

await step('long_text', async () => {
  const p = await page(); await p.goto(`${BASE}?fixture=account&theme=dark`); await p.waitForSelector('[data-card]');
  await p.evaluate(() => navigator.clipboard?.writeText?.('x').catch(() => {}));
  const long = 'Long '.repeat(900);
  await p.evaluate(t => { const dt = new DataTransfer(); dt.setData('text/plain', t); document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })); }, long + '\n' + 'body '.repeat(3000));
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => { const id = window.__sr.getState().selected[0]; const e = document.querySelector(`[data-note-id="${id}"]`); return e ? [e.getBoundingClientRect().width, e.getBoundingClientRect().height] : null; });
  await p.context().close(); return { cardSize: r };
});

await step('corrupt_storage', async () => {
  const p = await page(); await p.goto(`${BASE}?theme=dark`); await p.waitForSelector('[data-card]');
  await p.evaluate(() => { localStorage.setItem('stillroom.notes', '[{"id":"x1","type":"text","title":"kept"}]'); });
  await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(() => { localStorage.setItem('stillroom.notes.bak', localStorage.getItem('stillroom.notes')); localStorage.setItem('stillroom.notes', '{broken json'); });
  await p.reload(); await p.waitForTimeout(800);
  const s = await S(p); const toast = await p.evaluate(() => document.querySelector('.sr-toast')?.textContent ?? null);
  const damaged = await p.evaluate(() => Object.keys(localStorage).filter(k => k.includes('damaged')).length);
  await p.context().close(); return { notes: Object.keys(s.notes), toast, damagedCopies: damaged };
});

await step('offline_external_requests', async () => {
  const p = await page(); const ext = [];
  p.on('request', r => { const u = r.url(); if (!u.startsWith(BASE) && !/^(data|blob):/.test(u)) ext.push(u); });
  await p.goto(`${BASE}?fixture=demo&theme=dark`); await p.waitForTimeout(2500);
  await p.context().close(); return { externalRequests: ext };
});

await step('reduced_motion', async () => {
  const p = await page({ width: 1440, height: 900 }, { reducedMotion: 'reduce' }); await p.goto(`${BASE}?fixture=account&theme=dark`); await p.waitForSelector('[data-card]');
  const anims = await p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
  await p.context().close(); return { runningAnimations: anims, ok: anims === 0 };
});

await step('drop_20_images', async () => {
  const p = await page(); await p.goto(`${BASE}?fixture=account&theme=dark`); await p.waitForSelector('[data-card]');
  const b64 = fs.readFileSync(new URL('../public/fixtures/pebble-sand.jpg', import.meta.url)).toString('base64');
  const t0 = Date.now();
  const dt = await p.evaluateHandle(b64 => { const dt = new DataTransfer(); const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); for (let i = 0; i < 20; i++) dt.items.add(new File([bin], `p${i}.jpg`, { type: 'image/jpeg' })); return dt; }, b64);
  await p.dispatchEvent('.sr-app', 'drop', { dataTransfer: dt, clientX: 700, clientY: 450 });
  await p.waitForFunction(() => Object.values(window.__sr.getState().notes).filter(n => n.type === 'image' && n.mediaUrl?.startsWith('idb:')).length >= 20, null, { timeout: 30000 });
  const ms = Date.now() - t0; await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + 'drop_20.png' });
  const xs = Object.values((await S(p)).notes).filter(n => n.mediaUrl?.startsWith('idb:')).map(n => n.canvasX);
  await p.context().close(); return { ms, spanX: Math.max(...xs) - Math.min(...xs) };
});

fs.writeFileSync(OUT + 'probes.json', JSON.stringify(R, null, 1));
await b.close();
