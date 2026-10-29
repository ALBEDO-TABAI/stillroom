import { create } from 'zustand';
import type { Cam, Note, Prefs } from './types';
import { rectOf, type Rect } from '../lib/geometry';

export type Menu =
  | { kind: 'canvas'; sx: number; sy: number; wx: number; wy: number }
  | { kind: 'axis'; id: string }
  | null;

export interface UIState {
  userMenu: boolean;
  userSection: 'canvas' | 'modules' | 'usage' | null;
  shortcuts: boolean;
  menu: Menu;
  axisDownload: boolean;
  infoId: string | null;
  editorId: string | null;     // full-screen editor window
  editingId: string | null;    // inline edit on the canvas
  slideshowId: string | null;
  focus: boolean;
  search: string;
  searchOpen: boolean;
  binOpen: boolean;
  openFolderId: string | null;
  linkInput: { wx: number; wy: number } | null;
  recording: boolean;
  toast: string | null;
  dropActive: boolean;
}

type Snapshot = { notes: Record<string, Note>; order: string[] };

export interface State {
  notes: Record<string, Note>;
  order: string[];             // paint order, back → front
  sizes: Record<string, { w: number; h: number }>;
  cam: Cam;
  camAnim: number;             // ms for the next camera transition (0 = instant)
  selected: string[];
  hoverId: string | null;
  prefs: Prefs;
  ui: UIState;
  username: string;
  past: Snapshot[];
  future: Snapshot[];
  clipboard: Note[];

  setCam: (c: Cam, anim?: number) => void;
  setSize: (id: string, w: number, h: number) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setUI: (p: Partial<UIState>) => void;
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  add: (n: Note, opts?: { select?: boolean }) => void;
  update: (id: string, patch: Partial<Note> | ((n: Note) => Partial<Note>)) => void;
  updateMany: (patches: Record<string, Partial<Note>>) => void;
  remove: (ids: string[]) => void;
  restore: (ids: string[]) => void;
  purge: (ids: string[]) => void;
  select: (ids: string[], additive?: boolean) => void;
  setHover: (id: string | null) => void;
  reorder: (ids: string[], how: 'front' | 'back' | 'up' | 'down') => void;
  replaceAll: (notes: Note[], cam?: Cam) => void;
  rect: (id: string) => Rect;
}

export const DEFAULT_PREFS: Prefs = {
  dark: true, gap: 12, snapRadius: 26, smartGuides: true, magneticSnap: true, adaptiveScale: true,
  autoTranscribe: true, imageRounded: true, storeLocally: true, playbackSpeed: 1,
};

const initialUI: UIState = {
  userMenu: false, userSection: null, shortcuts: false, menu: null, axisDownload: false, infoId: null,
  editorId: null, editingId: null, slideshowId: null, focus: false, search: '', searchOpen: false, binOpen: false,
  openFolderId: null, linkInput: null, recording: false, toast: null, dropActive: false,
};

export const useStore = create<State>((set, get) => ({
  notes: {}, order: [], sizes: {}, cam: { x: 0, y: 0, z: 1 }, camAnim: 0, selected: [], hoverId: null,
  prefs: { ...DEFAULT_PREFS }, ui: { ...initialUI }, username: 'demo', past: [], future: [], clipboard: [],

  setCam: (c, anim = 0) => set({ cam: c, camAnim: anim }),
  setSize: (id, w, h) => {
    const s = get().sizes[id];
    if (s && Math.abs(s.w - w) < 0.5 && Math.abs(s.h - h) < 0.5) return;
    set(st => ({ sizes: { ...st.sizes, [id]: { w, h } } }));
  },
  setPrefs: p => set(st => ({ prefs: { ...st.prefs, ...p } })),
  setUI: p => set(st => ({ ui: { ...st.ui, ...p } })),
  checkpoint: () => set(st => ({ past: [...st.past.slice(-99), { notes: st.notes, order: st.order }], future: [] })),
  undo: () => set(st => {
    const prev = st.past[st.past.length - 1];
    if (!prev) return {};
    return { notes: prev.notes, order: prev.order, past: st.past.slice(0, -1), future: [...st.future, { notes: st.notes, order: st.order }] };
  }),
  redo: () => set(st => {
    const next = st.future[st.future.length - 1];
    if (!next) return {};
    return { notes: next.notes, order: next.order, future: st.future.slice(0, -1), past: [...st.past, { notes: st.notes, order: st.order }] };
  }),
  add: (n, opts) => {
    get().checkpoint();
    // a module made while a folder is open lives on that folder's canvas
    if (!n.parentId && get().ui.openFolderId && n.id !== get().ui.openFolderId) n = { ...n, parentId: get().ui.openFolderId };
    set(st => ({ notes: { ...st.notes, [n.id]: n }, order: [...st.order, n.id], selected: opts?.select ? [n.id] : st.selected }));
  },
  update: (id, patch) => set(st => {
    const n = st.notes[id];
    if (!n) return {};
    const p = typeof patch === 'function' ? patch(n) : patch;
    return { notes: { ...st.notes, [id]: { ...n, ...p, metadata: { ...n.metadata, ...(p.metadata || {}) }, updatedAt: Date.now() } } };
  }),
  updateMany: patches => set(st => {
    const notes = { ...st.notes };
    for (const [id, p] of Object.entries(patches)) {
      const n = notes[id]; if (!n) continue;
      notes[id] = { ...n, ...p, metadata: { ...n.metadata, ...(p.metadata || {}) } };
    }
    return { notes };
  }),
  remove: ids => {
    get().checkpoint();
    const now = Date.now();
    set(st => {
      const notes = { ...st.notes };
      for (const id of ids) {
        if (!notes[id]) continue;
        notes[id] = { ...notes[id], deletedAt: now };
        // a deleted folder hands its modules up to its own canvas (observed on the original: after deleting a
        // folder its contents were back on the root canvas while the folder sat in the Bin as "0 modules")
        for (const c of Object.values(notes)) if (c.parentId === id && !ids.includes(c.id)) notes[c.id] = { ...c, parentId: notes[id].parentId ?? null };
        // modules docked to it lose the dock
        for (const c of Object.values(notes)) {
          const d = c.metadata.dock; if (!d) continue;
          if (d.l === id || d.t === id) notes[c.id] = { ...notes[c.id], metadata: { ...notes[c.id].metadata, dock: { ...(d.l !== id ? { l: d.l } : {}), ...(d.t !== id ? { t: d.t } : {}) } } };
        }
      }
      return { notes, selected: st.selected.filter(s => !ids.includes(s)) };
    });
  },
  restore: ids => {
    get().checkpoint();
    set(st => {
      const notes = { ...st.notes };
      for (const id of ids) if (notes[id]) notes[id] = { ...notes[id], deletedAt: null };
      return { notes };
    });
  },
  purge: ids => {
    get().checkpoint();
    set(st => {
      const notes = { ...st.notes };
      for (const id of ids) delete notes[id];
      return { notes, order: st.order.filter(i => !ids.includes(i)) };
    });
  },
  select: (ids, additive) => set(st => ({ selected: additive ? Array.from(new Set([...st.selected, ...ids])) : ids })),
  setHover: id => { if (get().hoverId !== id) set({ hoverId: id }); },
  reorder: (ids, how) => set(st => {
    let order = st.order.slice();
    const sel = order.filter(i => ids.includes(i));
    if (how === 'front') order = [...order.filter(i => !ids.includes(i)), ...sel];
    else if (how === 'back') order = [...sel, ...order.filter(i => !ids.includes(i))];
    else {
      const step = how === 'up' ? 1 : -1;
      const idxs = sel.map(i => order.indexOf(i)).sort((a, b) => step * (b - a));
      for (const i of idxs) {
        const j = i + step;
        if (j < 0 || j >= order.length || ids.includes(order[j])) continue;
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    return { order };
  }),
  replaceAll: (list, cam) => set(() => ({
    notes: Object.fromEntries(list.map(n => [n.id, n])), order: list.map(n => n.id), selected: [], past: [], future: [],
    ...(cam ? { cam, camAnim: 0 } : {}),
  })),
  rect: id => rectOf(get().notes[id], get().sizes),
}));

/** Modules on the current canvas (root or the open folder's sub-canvas), not binned, in paint order. */
export const liveIds = (s: Pick<State, 'notes' | 'order'>, folder: string | null = useStore.getState().ui.openFolderId) =>
  s.order.filter(id => { const n = s.notes[id]; return n && !n.deletedAt && (n.parentId ?? null) === folder; });
/** Root → current folder chain. */
export const folderPath = (s: Pick<State, 'notes'>, id: string | null): string[] => { const out: string[] = []; let c = id; while (c && s.notes[c] && out.length < 32) { out.unshift(c); c = s.notes[c].parentId; } return out; };

let seq = 0;
export const newId = () => `${Date.now()}${String(seq++ % 1000).padStart(3, '0')}`;
export function blankNote(type: Note['type'], x: number, y: number, extra: Partial<Note> = {}): Note {
  const now = Date.now();
  return { id: newId(), type, title: '', text: '', createdAt: now, updatedAt: now, canvasX: Math.round(x), canvasY: Math.round(y),
    parentId: null, deletedAt: null, metadata: {}, ...extra };
}
