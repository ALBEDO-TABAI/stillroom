import { useStore, DEFAULT_PREFS } from './store';
import type { Cam, Note, Prefs } from './types';

const K = { notes: 'stillroom.notes', cam: 'stillroom.cam', prefs: 'stillroom.prefs', user: 'stillroom.user', folder: 'stillroom.folder', backup: 'stillroom.notes.bak' };

/** Last problem seen while loading/saving (shown once as a toast by the app). */
export let storageIssue: string | null = null;
const isNoteList = (v: unknown): v is Note[] => Array.isArray(v) && v.every(n => n && typeof n === 'object' && typeof (n as Note).id === 'string' && typeof (n as Note).type === 'string');
/** Parse a stored module list; a damaged copy is kept aside (never overwritten) and the backup is tried next. */
function readNotes(key: string): Note[] | null {
  const raw = localStorage.getItem(key); if (raw == null) return null;
  try { const v = JSON.parse(raw); if (isNoteList(v)) return v.map(n => ({ ...n, metadata: n.metadata ?? {}, parentId: n.parentId ?? null, deletedAt: n.deletedAt ?? null })); } catch { /* fall through */ }
  try { localStorage.setItem(`${key}.damaged-${Date.now()}`, raw); } catch { /* full */ }
  return null;
}
export const loadFolder = () => localStorage.getItem(K.folder) || null;
export function loadNotes(): Note[] | null {
  const main = readNotes(K.notes);
  if (main) return main;
  if (localStorage.getItem(K.notes) == null) return null; // first run
  const bak = readNotes(K.backup);
  storageIssue = bak ? 'Your canvas was damaged — restored the last good copy.' : 'Your canvas could not be read — a copy was kept aside.';
  return bak ?? [];
}
export function loadCam(): Cam | null {
  try { const s = localStorage.getItem(K.cam); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function loadPrefs(): Prefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(K.prefs) || '{}') }; } catch { return { ...DEFAULT_PREFS }; }
}
export const loadUser = () => localStorage.getItem(K.user) || 'demo';
export const saveUser = (u: string) => localStorage.setItem(K.user, u);

let tNotes: number | undefined, tCam: number | undefined;
export function startPersistence() {
  return useStore.subscribe((s, prev) => {
    if (!s.prefs.storeLocally) return;
    if (s.notes !== prev.notes || s.order !== prev.order) {
      clearTimeout(tNotes);
      tNotes = window.setTimeout(() => {
        const st = useStore.getState();
        const json = JSON.stringify(st.order.map(id => st.notes[id]).filter(Boolean));
        try {
          const prevJson = localStorage.getItem(K.notes);
          if (prevJson && prevJson !== json && isNoteList(safeParse(prevJson))) localStorage.setItem(K.backup, prevJson); // keep one good generation
          localStorage.setItem(K.notes, json);
        } catch {
          try { localStorage.removeItem(K.backup); localStorage.setItem(K.notes, json); }
          catch { useStore.getState().setUI({ toast: 'Storage is full — export your space to keep a copy.' }); }
        }
        desktopAutosave();
      }, 250);
    }
    if (s.cam !== prev.cam) {
      clearTimeout(tCam);
      tCam = window.setTimeout(() => localStorage.setItem(K.cam, JSON.stringify(useStore.getState().cam)), 120);
    }
    if (s.prefs !== prev.prefs) try { localStorage.setItem(K.prefs, JSON.stringify(s.prefs)); } catch { /* full */ }
    if (s.ui.openFolderId !== prev.ui.openFolderId) try { if (s.ui.openFolderId) localStorage.setItem(K.folder, s.ui.openFolderId); else localStorage.removeItem(K.folder); } catch { /* full */ }
  });
}
export function clearLocal() { Object.values(K).forEach(k => localStorage.removeItem(k)); }

function safeParse(s: string): unknown { try { return JSON.parse(s); } catch { return null; } }

// Mac app: mirror the space to disk (Application Support/Stillroom/autosave, with rotating backups).
type Desktop = { autosave(json: string): Promise<boolean>; linkPreview(url: string): Promise<{ title?: string; image?: string; site?: string } | null> };
export const desktop = (globalThis as any).stillroomDesktop as Desktop | undefined;
let tDisk = 0;
function desktopAutosave() {
  if (!desktop) return;
  clearTimeout(tDisk);
  tDisk = window.setTimeout(() => {
    const st = useStore.getState();
    void desktop.autosave(JSON.stringify({ app: 'stillroom', version: 1, savedAt: new Date().toISOString(), notes: st.order.map(id => st.notes[id]).filter(Boolean), cam: st.cam, prefs: st.prefs }));
  }, 1500);
}
