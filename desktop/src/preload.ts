// Narrow bridge for the renderer: autosave, link previews, and menu commands. Nothing else crosses.
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('stillroomDesktop', {
  autosave: (json: string) => ipcRenderer.invoke('sr:autosave', json),
  linkPreview: (url: string, refresh = false) => ipcRenderer.invoke('sr:og', url, refresh),
  revealBackups: () => ipcRenderer.invoke('sr:reveal-backups'),
});
ipcRenderer.on('sr:command', (_e, name: string) => window.dispatchEvent(new Event(name)));
