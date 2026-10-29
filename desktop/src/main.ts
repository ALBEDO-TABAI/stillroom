/**
 * Stillroom desktop: a thin Electron shell around the web build. The renderer is served from a privileged
 * `stillroom://app` origin so localStorage and IndexedDB (modules, media blobs) persist between launches,
 * and unknown paths (e.g. /user/<name>) fall back to index.html like the dev server does.
 */
import { app, BrowserWindow, Menu, protocol, net, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SCHEME = 'stillroom';
const DIST = [path.join(process.resourcesPath || '', 'renderer'), path.resolve(__dirname, '../../dist')].find(d => fs.existsSync(path.join(d, 'index.html'))) || path.resolve(__dirname, '../../dist');
protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

function createWindow() {
  const win = new BrowserWindow({ width: 1440, height: 900, minWidth: 720, minHeight: 500, backgroundColor: '#000000', titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 66 }, title: 'Stillroom', webPreferences: { contextIsolation: true, sandbox: true } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(SCHEME + ':')) { e.preventDefault(); shell.openExternal(url); } });
  win.loadURL(`${SCHEME}://app/`);
}

app.whenReady().then(() => {
  protocol.handle(SCHEME, req => {
    const u = new URL(req.url);
    let f = path.normalize(path.join(DIST, decodeURIComponent(u.pathname)));
    if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
    return net.fetch(pathToFileURL(f).toString());
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' }, { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
  ]));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
