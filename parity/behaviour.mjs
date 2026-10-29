// Functional checks of Stillroom in a real browser. node behaviour.mjs → docs/parity/behaviour.json
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://127.0.0.1:5410/';
const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const results = [];
const check = async (name, fn) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['microphone', 'clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '?fixture=demo&theme=dark'); await p.waitForSelector('[data-card]'); await p.waitForTimeout(800);
  const S = () => p.evaluate(() => { const s = window.__sr.getState(); return { notes: s.notes, order: s.order, cam: s.cam, selected: s.selected, ui: s.ui, prefs: s.prefs }; });
  const card = async id => { const bb = await (await p.$(`[data-note-id="${id}"]`)).boundingBox(); return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, bb }; };
  let ok = false, detail = '';
  try { const r = await fn(p, { S, card }); ok = r === true || r?.ok === true; detail = typeof r === 'object' ? JSON.stringify(r) : String(r); }
  catch (e) { detail = 'ERR ' + e.message.split('\n')[0]; }
  if (errors.length) { ok = false; detail += ' pageerrors: ' + errors.join(' | ').slice(0, 300); }
  results.push({ name, ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, detail.slice(0, 200));
  await ctx.close();
};

await check('drag module snaps to neighbour with the gap and docks', async (p, { S, card }) => {
  const c = await card('916'); // "No AI to babysit." docked above the hand image
  await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + 200, c.y - 300, { steps: 8 }); await p.mouse.move(c.x + 3, c.y - 2, { steps: 8 }); await p.mouse.up();
  const s = await S(); const n = s.notes['916'];
  return { ok: n.canvasX === 503 && n.canvasY === -224 && n.metadata.dock?.l === undefined, x: n.canvasX, y: n.canvasY, dock: n.metadata.dock };
});
await check('shift-drag moves without snap', async (p, { S, card }) => {
  const c = await card('916'); await p.keyboard.down('Shift');
  await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + 3, c.y + 3, { steps: 4 }); await p.mouse.up(); await p.keyboard.up('Shift');
  const n = (await S()).notes['916']; return { ok: n.canvasX !== 503 || n.canvasY !== -224, x: n.canvasX, y: n.canvasY };
});
await check('marquee selects several modules; P gallery layout rearranges them', async (p, { S }) => {
  await p.mouse.move(700, 600); await p.mouse.down(); await p.mouse.move(1430, 890, { steps: 10 }); await p.mouse.up();
  const s1 = await S(); const sel = s1.selected.slice();
  await p.keyboard.press('KeyP'); await p.waitForTimeout(300);
  const s2 = await S(); const moved = sel.filter(id => s1.notes[id].canvasX !== s2.notes[id].canvasX || s1.notes[id].canvasY !== s2.notes[id].canvasY);
  return { ok: sel.length >= 3 && moved.length > 0, selected: sel.length, moved: moved.length };
});
await check('L organic layout and R scatter, then undo restores', async (p, { S }) => {
  await p.keyboard.press('Control+a'); const s0 = await S();
  await p.keyboard.press('KeyL'); await p.waitForTimeout(200); await p.keyboard.press('KeyR'); await p.waitForTimeout(200);
  const s1 = await S(); await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z'); const s2 = await S();
  const changed = Object.keys(s0.notes).some(id => s0.notes[id].canvasX !== s1.notes[id].canvasX);
  const back = Object.keys(s0.notes).every(id => s0.notes[id].canvasX === s2.notes[id].canvasX && s0.notes[id].canvasY === s2.notes[id].canvasY);
  return { ok: changed && back, changed, back };
});
await check('delete to bin, restore from bin', async (p, { S, card }) => {
  const c = await card('912'); await p.mouse.click(c.x, c.y); await p.keyboard.press('Delete');
  const gone = !!(await S()).notes['912'].deletedAt;
  await p.goto(BASE + '?theme=dark'); // normal mode shows the bin
  await p.waitForSelector('[data-card]'); await p.evaluate(() => { localStorage.clear(); });
  return { ok: gone, gone };
});
await check('bin mode: delete → Bin shows it in a masonry view, Restore brings it back (normal mode)', async (p, { S, card }) => {
  await p.goto(BASE + '?theme=dark'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('[data-card]'); await p.waitForTimeout(500);
  const c = await card('a5'); await p.mouse.click(c.x, c.bb.y + 20); await p.keyboard.press('Backspace');
  await p.click('button[aria-label="Bin"]'); await p.waitForTimeout(300);
  const inView = await p.$('[data-bin-view] [data-note-id="a5"]') !== null;
  const ph = await p.getAttribute('.sr-search input', 'placeholder');
  const noRecord = await p.$('.sr-record') === null;
  await p.keyboard.press('Escape'); const still = (await S()).ui.binOpen;
  await p.click('[data-bin-view] [data-note-id="a5"]', { button: 'right' }); await p.getByRole('button', { name: 'Restore' }).click(); await p.waitForTimeout(200);
  const restored = !(await S()).notes['a5'].deletedAt;
  await p.click('button[aria-label="Bin"]'); const back = await p.$('[data-note-id="a5"]') !== null && !(await S()).ui.binOpen;
  return { ok: inView && ph === 'Search in Bin' && noRecord && still && restored && back, inView, ph, noRecord, still, restored, back };
});
await check('new account canvas: welcome, where-to-start list, empty folder, pictures, covered link (normal mode)', async (p, { S }) => {
  await p.goto(BASE + 'user/someone?theme=dark'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('[data-card]');
  const s = await S(); const ids = Object.keys(s.notes).sort().join();
  const cover = await p.$('[data-note-id="a6"] .sr-link--cover') !== null;
  const list = await p.$$eval('[data-note-id="a5"] li', l => l.length);
  const handle = await p.textContent('button[data-bc-pill]');
  return { ok: ids === 'a1,a2,a3,a4,a5,a6' && cover && list === 5 && handle === '@someone', ids, cover, list, handle };
});
await check('search: pill widens to 420, results show highlighted match, preview and date; Enter frames it', async (p, { S }) => {
  await p.goto(BASE + '?fixture=account&theme=dark'); await p.waitForSelector('[data-card]');
  await p.click('.sr-search input'); await p.waitForTimeout(400); const w1 = (await p.$eval('.sr-search-pill', e => e.getBoundingClientRect().width));
  await p.keyboard.type('where'); await p.waitForTimeout(300);
  const w2 = await p.$eval('.sr-search-pill', e => e.getBoundingClientRect().width);
  const hit = await p.textContent('.sr-search-item .sr-hit'); const meta = await p.textContent('.sr-search-item .m');
  await p.keyboard.press('Enter'); await p.waitForTimeout(700);
  return { ok: Math.round(w1) === 260 && Math.round(w2) === 420 && hit === 'where'.replace('w', 'W') && /\d/.test(meta) && (await S()).selected[0] === 'a5', w1, w2, hit, meta };
});
await check('handle opens the folder column; picking a folder opens it', async (p, { S }) => {
  await p.goto(BASE + '?fixture=account&theme=dark'); await p.waitForSelector('[data-card]');
  await p.click('button[data-bc-pill]'); await p.waitForTimeout(250);
  await p.click('button[data-bc-col-pill]'); await p.waitForTimeout(300);
  return { ok: (await S()).ui.openFolderId === 'a2', open: (await S()).ui.openFolderId };
});
await check('inline edit shows the format pill and Contain; Align and Contain change the module', async (p, { S, card }) => {
  await p.goto(BASE + '?fixture=account&theme=dark'); await p.waitForSelector('[data-card]');
  const c = await card('a5'); await p.mouse.dblclick(c.x, c.bb.y + 30); await p.waitForTimeout(300);
  const pill = await p.$('.sr-inline-pill') !== null;
  await p.click('.sr-inline-pill button[title^="Align"]'); const al = (await S()).notes['a5'].metadata.titleAlign;
  await p.click('.sr-inline-bottom'); const packed = (await S()).notes['a5'].metadata.packed;
  return { ok: pill && al === 'right' && packed === true, pill, al, packed };
});
await check('right-click canvas → Text creates and edits a new module', async (p, { S }) => {
  await p.mouse.click(1000, 820, { button: 'right' }); await p.waitForTimeout(300);
  await p.click('button[title="Text"]'); await p.waitForTimeout(200);
  await p.keyboard.type('Fresh thought'); await p.mouse.click(1400, 870); await p.waitForTimeout(200);
  const s = await S(); const n = Object.values(s.notes).find(n => n.title === 'Fresh thought');
  return { ok: !!n, n: n?.id };
});
await check('right-click canvas → Link → paste URL creates a link module', async (p, { S }) => {
  await p.mouse.click(1000, 820, { button: 'right' }); await p.waitForTimeout(300);
  await p.click('button[title="Link"]'); await p.keyboard.type('example.org/article'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  const n = Object.values((await S()).notes).find(n => n.type === 'link' && n.metadata.domain === 'example.org');
  return { ok: !!n && (await p.locator('.sr-domain', { hasText: 'example.org' }).count()) > 0 };
});
await check('right-click canvas → Folder; drag a module into it', async (p, { S, card }) => {
  const f = await card('1783355259111069'); const c = await card('902');
  await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(f.x, f.y, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(200);
  const s = await S(); const count = await p.locator('[data-note-id="1783355259111069"] .sr-folder-count').innerText();
  return { ok: s.notes['902'].parentId === '1783355259111069' && count.startsWith('1'), count };
});
await check('double-click packed text opens the editor; typing updates the module', async (p, { S, card }) => {
  const c = await card('913'); await p.mouse.dblclick(c.x, c.y); await p.waitForSelector('.sr-editor-window'); await p.waitForTimeout(400);
  await p.keyboard.press('End'); await p.keyboard.type(' Extra words.'); await p.waitForTimeout(150);
  await p.click('button[title="Text level"]'); // paragraph → H1 on the caret block
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const n = (await S()).notes['913'];
  return { ok: /Extra words/.test(n.text) && !(await S()).ui.editorId, text: n.text.slice(0, 120) };
});
await check('double-click unpacked text edits inline on the canvas', async (p, { S, card }) => {
  const c = await card('916'); await p.mouse.dblclick(c.x, c.y); await p.waitForTimeout(150);
  await p.keyboard.press('End'); await p.keyboard.type(' Really.'); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  const n = (await S()).notes['916']; return { ok: n.title.endsWith('Really.'), title: n.title };
});
await check('paste a URL and plain text from the clipboard', async (p, { S }) => {
  await p.evaluate(() => navigator.clipboard.writeText('https://stillroom.test/paste'));
  await p.keyboard.press('Control+v'); await p.waitForTimeout(200);
  await p.evaluate(() => navigator.clipboard.writeText('A pasted idea\nwith a body line'));
  await p.keyboard.press('Control+v'); await p.waitForTimeout(200);
  const ns = Object.values((await S()).notes);
  return { ok: ns.some(n => n.type === 'link' && n.metadata.domain === 'stillroom.test') && ns.some(n => n.title === 'A pasted idea' && /body line/.test(n.text)) };
});
await check('drop image + video + audio files creates media modules (IndexedDB)', async (p, { S }) => {
  const files = [['pebble-sand.jpg', 'image/jpeg'], ['pebble-breath.mp4', 'video/mp4'], ['idea.mp3', 'audio/mpeg']].map(([f, t]) => ({ name: f, type: t, b64: fs.readFileSync(new URL('../public/fixtures/' + f, import.meta.url)).toString('base64') }));
  const dt = await p.evaluateHandle(fs_ => { const dt = new DataTransfer(); for (const f of fs_) { const bin = Uint8Array.from(atob(f.b64), c => c.charCodeAt(0)); dt.items.add(new File([bin], f.name, { type: f.type })); } return dt; }, files);
  await p.dispatchEvent('.sr-app', 'drop', { dataTransfer: dt, clientX: 1100, clientY: 780 });
  await p.waitForTimeout(2500);
  const ns = Object.values((await S()).notes).filter(n => (n.mediaUrl || n.audioUrl || '').startsWith('idb:'));
  const types = ns.map(n => n.type).sort();
  const imgOk = await p.evaluate(() => [...document.querySelectorAll('.sr-media img')].some(i => i.src.startsWith('blob:') && i.naturalWidth > 0));
  return { ok: types.join() === 'audio,image,video' && imgOk, types, imgOk };
});
await check('record a voice module (fake microphone) and play it back', async (p, { S }) => {
  await p.click('button[aria-label="Record a voice module"]'); await p.waitForTimeout(1600);
  await p.click('button[aria-label="Stop recording"]'); await p.waitForTimeout(800);
  const n = Object.values((await S()).notes).find(n => n.type === 'audio' && n.audioUrl?.startsWith('idb:'));
  if (!n) return { ok: false };
  await p.click(`[data-note-id="${n.id}"] [data-card-play]`); await p.waitForTimeout(400);
  return { ok: !!n && n.duration !== '0:00', duration: n.duration };
});
await check('keyboard: +/− zoom, H reset, F focus, C centre, arrows move selection, ] [ layers', async (p, { S, card }) => {
  const z0 = (await S()).cam.z; await p.keyboard.press('Equal'); await p.waitForTimeout(250); const z1 = (await S()).cam.z;
  await p.keyboard.press('Minus'); await p.keyboard.press('Minus'); await p.waitForTimeout(250); const z2 = (await S()).cam.z;
  await p.keyboard.press('KeyH'); const h = (await S()).cam;
  await p.keyboard.press('KeyF'); const f = (await S()).ui.focus; await p.keyboard.press('KeyF');
  const c = await card('912'); await p.mouse.click(c.x, c.y); await p.keyboard.press('ArrowRight'); const sel = (await S()).selected[0];
  const o0 = (await S()).order.indexOf(sel); await p.keyboard.press('Shift+BracketRight'); const o1 = (await S()).order.indexOf(sel);
  await p.keyboard.press('KeyC'); await p.waitForTimeout(100); const cc = (await S()).cam;
  return { ok: Math.abs(z1 / z0 - 1.12) < 0.01 && z2 < z1 && h.x === 0 && h.z === 1 && f && sel !== '912' && o1 > o0 && cc.z > 1, z0, z1, z2, sel, o0, o1, cz: cc.z };
});
await check('wheel: trackpad-like pans, mouse wheel notches zoom, ctrl+wheel pinches', async (p, { S }) => {
  await p.mouse.move(720, 450); const c0 = (await S()).cam;
  await p.mouse.wheel(30, 20); await p.waitForTimeout(100); const c1 = (await S()).cam;
  await p.mouse.wheel(0, -100); await p.waitForTimeout(150); const c2 = (await S()).cam;
  await p.keyboard.down('Control'); await p.mouse.wheel(0, 8); await p.keyboard.up('Control'); await p.waitForTimeout(100); const c3 = (await S()).cam;
  return { ok: c1.x === c0.x - 30 && c1.z === c0.z && c2.z > c1.z && c3.z < c2.z, c0, c1, c2, c3 };
});
await check('axis menu: Info shows module info; Download → .md file', async (p, { card }) => {
  const c = await card('912'); await p.mouse.click(c.x, c.y, { button: 'right' }); await p.waitForTimeout(250);
  await p.getByRole('button', { name: 'Download' }).click();
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: '.md' }).click()]);
  const md = fs.readFileSync(await dl.path(), 'utf8');
  await p.mouse.click(c.x, c.y, { button: 'right' }); await p.waitForTimeout(250); await p.getByRole('button', { name: 'Info' }).click();
  const info = await p.getByText('Module Info').count();
  return { ok: md.startsWith('# Bring order') && info === 1, md: md.slice(0, 60) };
});
await check('settings: gap slider and rounded corners toggle take effect; theme toggle', async (p, { S }) => {
  await p.click('button[aria-label="User menu"]'); await p.getByText('Modules settings', { exact: true }).click(); await p.waitForTimeout(250);
  await p.getByRole('button', { name: 'Rounded corners' }).click(); await p.waitForTimeout(700);
  const r = await p.evaluate(() => getComputedStyle(document.querySelector('.sr-media')).borderTopLeftRadius);
  await p.keyboard.press('Escape'); await p.click('button[title="Light mode"]');
  const theme = await p.evaluate(() => document.documentElement.dataset.theme);
  return { ok: r === '0px' && theme === 'light' && (await S()).prefs.imageRounded === false, r, theme };
});
await check('search finds a module and frames it', async (p, { S }) => {
  await p.goto(BASE + '?theme=dark&fixture=demo&chrome=full'); await p.waitForSelector('[data-card]');
  await p.keyboard.press('Control+f'); await p.keyboard.type('babysit'); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
  const s = await S(); return { ok: s.selected[0] === '916' && s.cam.z > 0.75, sel: s.selected, z: s.cam.z };
});
await check('slideshow: Enter opens, arrows step, Esc closes', async (p, { S, card }) => {
  const c = await card('1791479134821221'); await p.mouse.click(c.x, c.y); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  const a = (await S()).ui.slideshowId; await p.keyboard.press('ArrowRight'); const b2 = (await S()).ui.slideshowId; await p.keyboard.press('Escape');
  return { ok: a === '1791479134821221' && b2 && b2 !== a && !(await S()).ui.slideshowId };
});
await check('persistence: modules and camera survive a reload (normal mode)', async (p, { S }) => {
  await p.goto(BASE + '?theme=dark'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('[data-card]');
  await p.mouse.click(1000, 820, { button: 'right' }); await p.click('button[title="Folder"]'); await p.waitForTimeout(600);
  await p.reload(); await p.waitForSelector('[data-card]'); await p.waitForTimeout(300);
  return { ok: Object.values((await S()).notes).some(n => n.type === 'folder' && n.title === 'New folder') };
});
await check('voice + video fixtures render (?fixture=media)', async (p) => {
  await p.goto(BASE + '?fixture=media&theme=dark'); await p.waitForSelector('[data-note-id="s-voice"]');
  return { ok: (await p.$('[data-note-id="s-voice"] [data-card-play]')) !== null && (await p.$('[data-note-id="s-video"] video')) !== null };
});
await check('audio drop: transcribing card (orange breathe, cycling phrase) then crystallize + cooling', async (p, { S }) => {
  await p.goto(BASE + '?theme=dark'); await p.waitForSelector('[data-note-id]');
  const files = [{ name: 'idea.mp3', type: 'audio/mpeg', b64: fs.readFileSync(new URL('../public/fixtures/idea.mp3', import.meta.url)).toString('base64') }];
  const dt = await p.evaluateHandle(fs_ => { const dt = new DataTransfer(); for (const f of fs_) { const bin = Uint8Array.from(atob(f.b64), c => c.charCodeAt(0)); dt.items.add(new File([bin], f.name, { type: f.type })); } return dt; }, files);
  await p.dispatchEvent('.sr-app', 'drop', { dataTransfer: dt, clientX: 1100, clientY: 780 });
  await p.waitForSelector('.sr-transcribing', { timeout: 4000 });
  const t1 = await p.textContent('.sr-transcribing [data-note-title]');
  const anim = await p.evaluate(() => getComputedStyle(document.querySelector('.sr-breathe')).backgroundImage);
  await p.waitForSelector('.sr-cooling', { timeout: 6000 });
  await p.waitForFunction(() => !document.querySelector('.sr-cooling'), null, { timeout: 9000 });
  const n = Object.values((await S()).notes).find(n => n.type === 'audio' && n.title === 'idea');
  return { ok: /\.\.\.$/.test(t1) && /255, 160, 0/.test(anim) && !!n, t1, anim };
});
await check('bin: Clear All asks, then empties the bin; empty bin hides Clear All', async (p, { S, card }) => {
  await p.goto(BASE + '?theme=dark'); await p.waitForSelector('[data-note-id="a5"]');
  const c = await card('a5'); await p.mouse.click(c.x, c.y); await p.keyboard.press('Delete'); await p.waitForTimeout(200);
  await p.click('button[aria-label="Bin"]'); await p.waitForTimeout(300);
  let asked = ''; p.once('dialog', d => { asked = d.message(); d.accept(); });
  await p.getByRole('button', { name: 'Clear All' }).click(); await p.waitForTimeout(300);
  const gone = !(await S()).notes['a5']; const hidden = (await p.$('button:has-text("Clear All")')) === null;
  await p.click('button[aria-label="Bin"]');
  return { ok: /Permanently delete/.test(asked) && gone && hidden, asked, gone, hidden };
});
fs.mkdirSync(new URL('../docs/parity/', import.meta.url).pathname, { recursive: true });
fs.writeFileSync(new URL('../docs/parity/behaviour.json', import.meta.url).pathname, JSON.stringify(results, null, 1));
console.log(`${results.filter(r => r.ok).length}/${results.length} passed`);
await b.close();
