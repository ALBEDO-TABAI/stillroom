import { useEffect } from 'react';
import { useStore, liveIds, newId } from '../store/store';
import { keyZoom, resetView, frameRect } from './camera';
import { rectOf, union } from '../lib/geometry';
import { galleryLayout, organicLayout, scatter } from '../lib/layouts';
import { addTextOrLink, addFiles } from '../lib/capture';
import { toWorld } from './camera';
import { isTyping } from './Canvas';
import { escapeStackDepth } from '../lib/motion';

/** Spatial neighbour in a direction (arrow-key navigation between modules). */
function neighbour(from: string, dir: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') {
  const st = useStore.getState(); const a = rectOf(st.notes[from], st.sizes);
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  let best: string | null = null, bd = Infinity;
  for (const id of liveIds(st)) {
    if (id === from) continue;
    const b = rectOf(st.notes[id], st.sizes); const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const dx = bc.x - ac.x, dy = bc.y - ac.y;
    const ok = dir === 'ArrowLeft' ? dx < -1 : dir === 'ArrowRight' ? dx > 1 : dir === 'ArrowUp' ? dy < -1 : dy > 1;
    if (!ok) continue;
    const along = dir === 'ArrowLeft' || dir === 'ArrowRight' ? Math.abs(dx) : Math.abs(dy);
    const across = dir === 'ArrowLeft' || dir === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx);
    const d = along + across * 2;
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const st = useStore.getState(); const ui = st.ui; const mod = e.metaKey || e.ctrlKey;
      const sel = st.selected.filter(id => st.notes[id] && !st.notes[id].deletedAt);
      if (ui.slideshowId || ui.editorId) return; // those surfaces own the keyboard
      const k = e.key;
      if (mod && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? st.redo() : st.undo(); return; }
      if (mod && k.toLowerCase() === 'y') { e.preventDefault(); st.redo(); return; }
      if (mod && k.toLowerCase() === 'a') { e.preventDefault(); st.select(liveIds(st)); return; }
      if (mod && k.toLowerCase() === 'f') { e.preventDefault(); dispatchEvent(new Event('sr:search')); return; }
      if (mod && k.toLowerCase() === 'n') {
        e.preventDefault(); const c = toWorld(innerWidth / 2, innerHeight / 2);
        const n = { id: newId(), type: 'text' as const, title: '', text: '', createdAt: Date.now(), updatedAt: Date.now(), canvasX: Math.round(c.x - 130), canvasY: Math.round(c.y - 33), parentId: null, deletedAt: null, metadata: {} };
        st.add(n, { select: true }); st.setUI({ editingId: n.id }); return;
      }
      if (mod && (k.toLowerCase() === 'c' || k.toLowerCase() === 'x')) {
        if (!sel.length) return;
        const items = sel.map(id => st.notes[id]);
        useStore.setState({ clipboard: items });
        navigator.clipboard?.writeText(items.map(n => n.title + (n.text ? '\n' + n.text.replace(/<[^>]+>/g, ' ') : '')).join('\n\n')).catch(() => {});
        if (k.toLowerCase() === 'x') st.remove(sel);
        e.preventDefault(); return;
      }
      if (mod) return;
      if (k === 'Escape') {
        if (escapeStackDepth()) return;
        if (ui.editingId) st.setUI({ editingId: null });
        else if (ui.focus) st.setUI({ focus: false });
        else st.select([]);
        return;
      }
      if (k === 'Delete' || k === 'Backspace') { if (sel.length) { e.preventDefault(); st.remove(sel); } return; }
      if (k === 'Enter') {
        const one = sel.length === 1 ? st.notes[sel[0]] : null;
        if (!one) return; e.preventDefault();
        if (one.type === 'image' || one.type === 'video') st.setUI({ slideshowId: one.id });
        else if (one.type === 'text' || one.type === 'audio') st.setUI({ editorId: one.id });
        return;
      }
      if (k.startsWith('Arrow')) {
        e.preventDefault();
        const cur = sel[sel.length - 1] ?? st.hoverId ?? liveIds(st)[0]; if (!cur) return;
        const nx = sel.length ? neighbour(cur, k as any) : cur;
        if (nx) { st.select([nx]); const r = rectOf(st.notes[nx], st.sizes); ensureVisible(r); }
        return;
      }
      if (k === 'Tab') {
        e.preventDefault(); const ids = liveIds(st); if (!ids.length) return;
        const sorted = ids.slice().sort((a, b) => { const ra = rectOf(st.notes[a], st.sizes), rb = rectOf(st.notes[b], st.sizes); return ra.y - rb.y || ra.x - rb.x; });
        const i = sel.length ? sorted.indexOf(sel[sel.length - 1]) : -1;
        const nx = sorted[(i + (e.shiftKey ? -1 : 1) + sorted.length) % sorted.length];
        st.select([nx]); ensureVisible(rectOf(st.notes[nx], st.sizes)); return;
      }
      switch (e.code) {
        case 'Equal': case 'NumpadAdd': e.preventDefault(); keyZoom(1); return;
        case 'Minus': case 'NumpadSubtract': e.preventDefault(); keyZoom(-1); return;
        case 'BracketRight': if (sel.length) st.reorder(sel, e.shiftKey ? 'front' : 'up'); return;
        case 'BracketLeft': if (sel.length) st.reorder(sel, e.shiftKey ? 'back' : 'down'); return;
        case 'KeyH': resetView(); return;
        case 'KeyF': st.setUI({ focus: !ui.focus, userMenu: false }); return;
        case 'KeyC': if (sel.length) frameRect(union(sel.map(id => rectOf(st.notes[id], st.sizes))), { pad: 60, anim: 520 }); return;
        case 'KeyP': galleryLayout(sel); return;
        case 'KeyL': organicLayout(sel); return;
        case 'KeyR': if (sel.length >= 2) scatter(sel); return;
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e)) return;
      const st = useStore.getState(); const c = toWorld(innerWidth / 2, innerHeight / 2);
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) { e.preventDefault(); addFiles(files, { x: c.x - 130, y: c.y - 100 }); return; }
      const text = e.clipboardData?.getData('text/plain') ?? '';
      const internal = st.clipboard;
      e.preventDefault();
      if (internal.length && text && internal.map(n => n.title).some(t => text.startsWith(t))) {
        st.checkpoint();
        const ids: string[] = [];
        useStore.setState(s => {
          const notes = { ...s.notes }; const order = [...s.order];
          for (const n of internal) { const id = newId(); notes[id] = { ...n, id, canvasX: n.canvasX + 24, canvasY: n.canvasY + 24, deletedAt: null, createdAt: Date.now(), metadata: { ...n.metadata, dock: null } }; order.push(id); ids.push(id); }
          return { notes, order };
        });
        st.select(ids); return;
      }
      addTextOrLink(text, c);
    };
    addEventListener('keydown', onKey); addEventListener('paste', onPaste);
    return () => { removeEventListener('keydown', onKey); removeEventListener('paste', onPaste); };
  }, []);
}

function ensureVisible(r: { x: number; y: number; w: number; h: number }) {
  const c = useStore.getState().cam; const sx = r.x * c.z + c.x, sy = r.y * c.z + c.y;
  if (sx < 40 || sy < 70 || sx + r.w * c.z > innerWidth - 40 || sy + r.h * c.z > innerHeight - 80)
    useStore.getState().setCam({ x: Math.round(innerWidth / 2 - (r.x + r.w / 2) * c.z), y: Math.round(innerHeight / 2 - (r.y + r.h / 2) * c.z), z: c.z }, 520);
}
