/**
 * Stillroom desktop: a thin Electron shell around the web build. The renderer is served from a privileged
 * `stillroom://app` origin so localStorage and IndexedDB (modules, media blobs) persist between launches,
 * and unknown paths (e.g. /user/<name>) fall back to index.html like the dev server does.
 *
 * Desktop extras: a real menu bar with ⌘ shortcuts, remembered window bounds, a global quick-capture
 * shortcut (⌥⌘Space), autosave of the space to disk with rotating backups, and link previews (Open Graph
 * tags fetched here in the main process, cached on disk) so the renderer never talks to the network itself.
 */
import { app, BrowserWindow, Menu, protocol, net, shell, ipcMain, globalShortcut, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SCHEME = 'stillroom';
const DIST = [path.join(process.resourcesPath || '', 'renderer'), path.resolve(__dirname, '../../dist')].find(d => fs.existsSync(path.join(d, 'index.html'))) || path.resolve(__dirname, '../../dist');
protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

const data = (...p: string[]) => path.join(app.getPath('userData'), ...p);
const readJson = <T,>(f: string, d: T): T => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeAtomic = (f: string, s: string) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', s); fs.renameSync(f + '.tmp', f); };

// ---- window state -------------------------------------------------------------------------------
type Bounds = { x?: number; y?: number; width: number; height: number; maximized?: boolean; fullscreen?: boolean };
function loadBounds(): Bounds {
  const b = readJson<Bounds>(data('window.json'), { width: 1440, height: 900 });
  // drop a position that is no longer on any display (unplugged monitor)
  if (b.x != null && b.y != null && !screen.getAllDisplays().some(d => { const a = d.workArea; return b.x! < a.x + a.width - 80 && b.x! + b.width > a.x + 80 && b.y! >= a.y - 20 && b.y! < a.y + a.height - 80; })) { delete b.x; delete b.y; }
  return b;
}
function trackBounds(win: BrowserWindow) {
  let t: NodeJS.Timeout | undefined;
  const save = () => { clearTimeout(t); t = setTimeout(() => { if (win.isDestroyed()) return; writeAtomic(data('window.json'), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized(), fullscreen: win.isFullScreen() })); }, 400); };
  ['resize', 'move', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'].forEach(ev => win.on(ev as any, save));
}

let main: BrowserWindow | null = null;
function createWindow() {
  const b = loadBounds();
  const win = main = new BrowserWindow({ ...b, minWidth: 720, minHeight: 500, backgroundColor: '#000000', titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 66 }, title: 'Stillroom', show: false,
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.cjs') } });
  if (b.maximized) win.maximize();
  if (b.fullscreen) win.setFullScreen(true);
  win.once('ready-to-show', () => win.show());
  trackBounds(win);
  win.on('closed', () => { if (main === win) main = null; });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(SCHEME + ':')) { e.preventDefault(); shell.openExternal(url); } });
  win.loadURL(`${SCHEME}://app/`);
  return win;
}
const send = (name: string) => { const w = main ?? createWindow(); const go = () => w.webContents.send('sr:command', name); w.webContents.isLoading() ? w.webContents.once('did-finish-load', go) : go(); };

// ---- autosave with rotating backups --------------------------------------------------------------
// The renderer sends the space JSON (modules, camera, prefs; media stays in IndexedDB) a moment after each change.
// latest.json is replaced atomically; a timestamped copy is kept at most once every 30 minutes, newest 48 kept.
let lastBackup = 0;
ipcMain.handle('sr:autosave', (_e, json: string) => {
  if (typeof json !== 'string' || json.length > 64 * 1024 * 1024) return false;
  try { JSON.parse(json); } catch { return false; }
  writeAtomic(data('autosave', 'latest.json'), json);
  if (Date.now() - lastBackup > 30 * 60_000) {
    lastBackup = Date.now();
    const dir = data('autosave', 'backups');
    writeAtomic(path.join(dir, `space-${new Date().toISOString().replace(/[:.]/g, '-')}.json`), json);
    fs.readdirSync(dir).filter(f => f.startsWith('space-')).sort().reverse().slice(48).forEach(f => fs.rmSync(path.join(dir, f), { force: true }));
  }
  return true;
});
ipcMain.handle('sr:reveal-backups', () => { fs.mkdirSync(data('autosave'), { recursive: true }); shell.openPath(data('autosave')); });

// ---- link previews (Open Graph), cached ------------------------------------------------------------
type Og = { title?: string; image?: string; site?: string; at: number };
const ogCacheFile = () => data('og-cache.json');
let ogCache: Record<string, Og> | null = null;
const attr = (html: string, key: string) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i'); const tag = html.match(re)?.[0];
  return tag?.match(/content=["']([^"']*)["']/i)?.[1];
};
const decode = (s?: string) => s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() || undefined;
ipcMain.handle('sr:og', async (_e, url: string) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  ogCache ??= readJson<Record<string, Og>>(ogCacheFile(), {});
  const hit = ogCache[url]; if (hit && Date.now() - hit.at < 7 * 864e5) return hit;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    const r = await net.fetch(url, { signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Stillroom link preview', accept: 'text/html' }, credentials: 'omit' } as any);
    clearTimeout(t);
    if (!r.ok || !/html/i.test(r.headers.get('content-type') ?? '')) return null;
    const html = (await r.text()).slice(0, 512 * 1024);
    let image = decode(attr(html, 'og:image') ?? attr(html, 'twitter:image'));
    if (image) try { image = new URL(image, r.url).toString(); } catch { image = undefined; }
    const og: Og = { title: decode(attr(html, 'og:title') ?? attr(html, 'twitter:title') ?? html.match(/<title[^>]*>([^<]*)/i)?.[1])?.slice(0, 300), image, site: decode(attr(html, 'og:site_name')), at: Date.now() };
    ogCache[url] = og;
    const keys = Object.keys(ogCache); if (keys.length > 2000) keys.sort((a, b) => ogCache![a].at - ogCache![b].at).slice(0, keys.length - 2000).forEach(k => delete ogCache![k]);
    writeAtomic(ogCacheFile(), JSON.stringify(ogCache));
    return og;
  } catch { return null; }
});

// ---- menu ----------------------------------------------------------------------------------------
function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { label: 'File', submenu: [
      { label: 'New Text', accelerator: 'CmdOrCtrl+N', click: () => send('sr:new-text') },
      { label: 'Quick Capture', accelerator: 'Alt+CmdOrCtrl+Space', click: () => quickCapture() },
      { type: 'separator' },
      { label: 'Export Space…', accelerator: 'Shift+CmdOrCtrl+E', click: () => send('sr:export-space') },
      { label: 'Import Space…', accelerator: 'Shift+CmdOrCtrl+O', click: () => send('sr:import-space') },
      { label: 'Show Autosave Backups', click: () => shell.openPath((fs.mkdirSync(data('autosave'), { recursive: true }), data('autosave'))) },
      { type: 'separator' }, { role: 'close' },
    ] },
    { role: 'editMenu' },
    { label: 'View', submenu: [
      { label: 'Search', accelerator: 'CmdOrCtrl+F', click: () => send('sr:search') },
      { type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' },
    ] },
    { role: 'windowMenu' },
  ]));
}
function quickCapture() {
  const w = main ?? createWindow();
  if (w.isMinimized()) w.restore();
  w.show(); app.focus({ steal: true }); w.focus();
  send('sr:new-text');
}

app.whenReady().then(() => {
  protocol.handle(SCHEME, req => {
    const u = new URL(req.url);
    let f = path.normalize(path.join(DIST, decodeURIComponent(u.pathname)));
    if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
    return net.fetch(pathToFileURL(f).toString());
  });
  buildMenu();
  createWindow();
  globalShortcut.register('Alt+CommandOrControl+Space', quickCapture); // fails quietly if another app owns it
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); else main?.show(); });
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
