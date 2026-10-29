import { useStore, DEFAULT_PREFS } from './store';
import type { Cam, Note, Prefs } from './types';

const K = { notes: 'stillroom.notes', cam: 'stillroom.cam', prefs: 'stillroom.prefs', user: 'stillroom.user' };
export function loadNotes(): Note[] | null {
  try { const s = localStorage.getItem(K.notes); return s ? JSON.parse(s) : null; } catch { return null; }
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
        localStorage.setItem(K.notes, JSON.stringify(st.order.map(id => st.notes[id]).filter(Boolean)));
      }, 250);
    }
    if (s.cam !== prev.cam) {
      clearTimeout(tCam);
      tCam = window.setTimeout(() => localStorage.setItem(K.cam, JSON.stringify(useStore.getState().cam)), 120);
    }
    if (s.prefs !== prev.prefs) localStorage.setItem(K.prefs, JSON.stringify(s.prefs));
  });
}
export function clearLocal() { Object.values(K).forEach(k => localStorage.removeItem(k)); }
