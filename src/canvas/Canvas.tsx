import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useStore, liveIds } from '../store/store';
import { onWheel, toWorld, zoomAt, frameRect } from './camera';
import { NoteView, type CardHandlers } from './NoteView';
import { clusters, silhouettePath } from './clusters';
import { snap, computeDocks, setGuides, useGuides } from './drag';
import { rectOf, intersects, noteWidth, isPacked, union, type Rect } from '../lib/geometry';
import { adaptiveSnap, scaleSelection, animateSelection } from './selection';
import { Arcs } from '../cards/Arcs';
import type { Note } from '../store/types';
import { openFolder } from './folders';
import type { Corner } from '../cards/Arcs';

type Drag =
  | { kind: 'move'; id: string; sx: number; sy: number; start: Record<string, Rect>; startNotes: Record<string, Note>; adaptive?: ReturnType<typeof adaptiveSnap>; dropTarget?: string | null; moved: boolean; shake: { t: number; dx: number; dy: number; flipsX: number; flipsY: number; lx: number; ly: number }; dupe?: boolean }
  | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number }
  | { kind: 'marquee'; sx: number; sy: number; x: number; y: number; additive: string[] }
  | { kind: 'resize'; id: string; corner: Corner | 'l' | 'r' | 't' | 'b'; sx: number; sy: number; w: number; scale: number; x: number; y: number; h: number; rotate: boolean; group?: { rects: Record<string, Rect>; notes: Record<string, Note> } }
  | { kind: 'crop'; id: string; sx: number; sy: number; cx: number; cy: number }
  | null;

export function Canvas() {
  const cam = useStore(s => s.cam);
  const camAnim = useStore(s => s.camAnim);
  const order = useStore(s => s.order);
  const notes = useStore(s => s.notes);
  const sizes = useStore(s => s.sizes);
  const hoverId = useStore(s => s.hoverId);
  const menu = useStore(s => s.ui.menu);
  const dark = useStore(s => s.prefs.dark);
  const vp = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [dropFolder, setDropFolder] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const space = useRef(false);
  const guides = useSyncExternalStore(f => { useGuides.listeners.add(f); return () => useGuides.listeners.delete(f); }, () => useGuides.lines);

  const selected = useStore(s => s.selected);
  const folder = useStore(s => s.ui.openFolderId);
  const folderExists = !folder || !!notes[folder] && !notes[folder].deletedAt;
  useEffect(() => {
    if (!folderExists) openFolder(folder ? notes[folder]?.parentId ?? null : null);
  }, [folder, folderExists]);
  const ids = useMemo(() => liveIds({ notes, order }, folder), [notes, order, folder]);
  const selectedIds = selected.filter(id => ids.includes(id));
  const selectionRects = selectedIds.map(id => rectOf(notes[id], sizes));
  const selectionBox = selectedIds.length > 1 ? union(selectionRects) : null;
  const groups = useMemo(() => {
    const items = ids.map(id => ({ id, r: rectOf(notes[id], sizes) }));
    return clusters(items).filter(g => g.length > 1).map(g => ({ ids: g, d: silhouettePath(g.map(id => rectOf(notes[id], sizes))) }));
  }, [ids, notes, sizes]);

  // wheel must be non-passive
  useEffect(() => {
    const el = vp.current!; el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // space-to-pan
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTyping(e)) return;
      e.preventDefault(); if (!space.current) { space.current = true; document.body.classList.add('sr-space-ready'); }
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') { space.current = false; document.body.classList.remove('sr-space-ready', 'sr-space-active'); } };
    addEventListener('keydown', down); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); };
  }, []);

  // touch pinch / two-finger pan
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number; mx: number; my: number; cx: number; cy: number } | null>(null);

  const startPan = (e: React.PointerEvent) => {
    const c = useStore.getState().cam;
    drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: c.x, cy: c.y };
    document.body.classList.add('sr-space-active');
  };

  const onBgDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        const c = useStore.getState().cam;
        pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: c.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cx: c.x, cy: c.y };
        drag.current = null; setMarquee(null); return;
      }
    }
    const st = useStore.getState();
    if (st.ui.editingId) { (document.activeElement as HTMLElement)?.blur?.(); st.setUI({ editingId: null }); }
    if (e.button === 1 || (e.button === 0 && space.current)) { e.preventDefault(); startPan(e); capture(e); return; }
    if (e.button !== 0) return;
    if (st.ui.menu || st.ui.userMenu) { st.setUI({ menu: null, userMenu: false, axisDownload: false, infoId: null }); }
    const w = toWorld(e.clientX, e.clientY);
    drag.current = { kind: 'marquee', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, additive: e.shiftKey ? st.selected : [] };
    capture(e);
  };

  const capture = (e: React.PointerEvent) => { try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ } };

  const h: CardHandlers = useMemo(() => ({
    onDown: (e, id) => {
      if (e.button === 1 || (e.button === 0 && space.current)) { e.stopPropagation(); e.preventDefault(); startPan(e); vp.current!.setPointerCapture(e.pointerId); return; }
      if (e.button !== 0) return;
      const st = useStore.getState();
      if (st.ui.editingId === id) { e.stopPropagation(); return; }
      e.stopPropagation();
      if (st.ui.editingId) { (document.activeElement as HTMLElement)?.blur?.(); st.setUI({ editingId: null }); }
      if (st.ui.menu) st.setUI({ menu: null, axisDownload: false, infoId: null });
      const n = st.notes[id];
      if (e.altKey && n.type === 'image') {
        const c = n.metadata.crop ?? { x: 50, y: 50, w: 1, h: 1 };
        drag.current = { kind: 'crop', id, sx: e.clientX, sy: e.clientY, cx: c.x, cy: c.y };
        vp.current!.setPointerCapture(e.pointerId); return;
      }
      let sel = st.selected;
      if (e.shiftKey || e.metaKey) { sel = sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id]; st.select(sel); if (!sel.includes(id)) return; }
      else if (!sel.includes(id)) { sel = [id]; st.select(sel); }
      const start: Record<string, Rect> = {};
      for (const s of sel) { const m = st.notes[s]; if (m) start[s] = rectOf(m, st.sizes); }
      drag.current = { kind: 'move', id, sx: e.clientX, sy: e.clientY, start, startNotes: st.notes, moved: false, shake: { t: performance.now(), dx: 0, dy: 0, flipsX: 0, flipsY: 0, lx: e.clientX, ly: e.clientY } };
      vp.current!.setPointerCapture(e.pointerId);
    },
    onArc: (e, id, corner) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const st = useStore.getState(); const n = st.notes[id]; const r = rectOf(n, st.sizes);
      st.checkpoint(); st.select([id]);
      drag.current = { kind: 'resize', id, corner, sx: e.clientX, sy: e.clientY, w: r.w, h: r.h, x: r.x, y: r.y, scale: n.metadata.titleFontScale ?? 1, rotate: e.shiftKey && n.type === 'image' };
      vp.current!.setPointerCapture(e.pointerId);
    },
    onEdge: (e, id, side) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const st = useStore.getState(); const n = st.notes[id]; const r = rectOf(n, st.sizes);
      st.checkpoint();
      drag.current = { kind: 'resize', id, corner: side, sx: e.clientX, sy: e.clientY, w: r.w, h: r.h, x: r.x, y: r.y, scale: n.metadata.titleFontScale ?? 1, rotate: false };
      vp.current!.setPointerCapture(e.pointerId);
    },
    onDouble: (e, id) => {
      e.stopPropagation();
      const st = useStore.getState(); const n = st.notes[id];
      if (n.type === 'image') st.setUI({ slideshowId: id });
      else if (n.type === 'folder') openFolder(id);
      else if (n.type === 'link') window.open(n.metadata.url ?? n.title, '_blank', 'noopener');
      else if (n.type === 'video') st.setUI({ slideshowId: id });
      else if (n.type === 'text' && !isPacked(n)) st.setUI({ editingId: id });
      else st.setUI({ editorId: id });
    },
    onContext: (e, id) => {
      e.preventDefault(); e.stopPropagation();
      const st = useStore.getState();
      const selection = st.selected.includes(id) ? st.selected : [id];
      if (!st.selected.includes(id)) st.select(selection);
      const r = union(selection.map(i => rectOf(st.notes[i], st.sizes))), c = st.cam;
      if (r.x * c.z + c.x < 140 || r.y * c.z + c.y < 140 || (r.x + r.w) * c.z + c.x > innerWidth - 140 || (r.y + r.h) * c.z + c.y > innerHeight - 100)
        frameRect(r, { pad: 170, maxZ: c.z, anim: 220 });
      st.setUI({ menu: { kind: 'axis', id }, axisDownload: false, infoId: null, userMenu: false });
    },
  }), []);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && touches.current.has(e.pointerId)) {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current && touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        const p = pinch.current; const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        useStore.getState().setCam({ x: p.cx + (mx - p.mx), y: p.cy + (my - p.my), z: p.z });
        zoomAt(mx, my, p.z * (d / p.d));
        return;
      }
    }
    const st = useStore.getState();
    const d = drag.current;
    if (!d) {
      const t = (e.target as HTMLElement).closest?.('[data-card]') as HTMLElement | null;
      st.setHover(t?.dataset.noteId ?? null);
      return;
    }
    const z = st.cam.z;
    if (d.kind === 'pan') { st.setCam({ x: d.cx + e.clientX - d.sx, y: d.cy + e.clientY - d.sy, z }); return; }
    if (d.kind === 'marquee') {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3) return;
      const w = toWorld(e.clientX, e.clientY);
      const r = { x: Math.min(d.x, w.x), y: Math.min(d.y, w.y), w: Math.abs(w.x - d.x), h: Math.abs(w.y - d.y) };
      setMarquee({ x: Math.min(d.sx, e.clientX), y: Math.min(d.sy, e.clientY), w: Math.abs(e.clientX - d.sx), h: Math.abs(e.clientY - d.sy) });
      const hit = liveIds(st).filter(id => intersects(r, rectOf(st.notes[id], st.sizes)));
      st.select(Array.from(new Set([...d.additive, ...hit])));
      return;
    }
    if (d.kind === 'crop') {
      const dx = (e.clientX - d.sx) / z, dy = (e.clientY - d.sy) / z;
      const r = rectOf(st.notes[d.id], st.sizes);
      st.update(d.id, { metadata: { crop: { x: clamp(d.cx - dx / r.w * 100, 0, 100), y: clamp(d.cy - dy / r.h * 100, 0, 100), w: 1, h: 1 } } });
      return;
    }
    if (d.kind === 'resize') {
      const n = st.notes[d.id]; const dx = (e.clientX - d.sx) / z, dy = (e.clientY - d.sy) / z;
      if (d.rotate) return; // rotation resolves on release
      const c = d.corner;
      if (d.group) {
        const right = c === 'ne' || c === 'se', bottom = c === 'sw' || c === 'se';
        const minK = Math.max(...Object.entries(d.group.rects).map(([id, r]) => (d.group!.notes[id].type === 'folder' ? 160 : 80) / r.w));
        const k = Math.max(minK, Math.max((d.w + (right ? dx : -dx)) / d.w, (d.h + (bottom ? dy : -dy)) / d.h));
        const origin = { x: right ? d.x : d.x + d.w, y: bottom ? d.y : d.y + d.h };
        st.updateMany(scaleSelection(d.group.notes, d.group.rects, origin, origin, k));
        return;
      }
      if (c === 'l' || c === 'r') {
        const nw = Math.max(80, d.w + (c === 'r' ? dx : -dx));
        st.update(d.id, { canvasX: c === 'l' ? Math.round(d.x + d.w - nw) : d.x, metadata: { displayWidth: Math.round(nw) } });
        return;
      }
      if (c === 't' || c === 'b') {
        const k = Math.max(0.4, (d.h + (c === 'b' ? dy : -dy)) / d.h);
        st.update(d.id, { metadata: { titleFontScale: +(d.scale * k).toFixed(4) } });
        return;
      }
      const sxn = c === 'ne' || c === 'se' ? 1 : -1, syn = c === 'sw' || c === 'se' ? 1 : -1;
      const k = Math.max(0.25, Math.max((d.w + sxn * dx) / d.w, (d.h + syn * dy) / d.h));
      const nw = Math.max(n.type === 'folder' ? 160 : 80, Math.round(d.w * k));
      const patch: any = { metadata: { displayWidth: nw } };
      if (n.type === 'text') patch.metadata.titleFontScale = +(d.scale * k).toFixed(4);
      if (n.type === 'text' && n.metadata.frameH) patch.metadata.frameH = undefined;
      if (sxn < 0) patch.canvasX = Math.round(d.x + d.w - nw);
      if (syn < 0) patch.canvasY = Math.round(d.y + d.h - d.h * (nw / d.w));
      st.update(d.id, patch);
      return;
    }
    if (d.kind === 'move') {
      const dxs = e.clientX - d.sx, dys = e.clientY - d.sy;
      if (!d.moved) {
        if (Math.hypot(dxs, dys) < 3) return;
        d.moved = true; st.checkpoint(); setDraggingId(d.id);
        if (e.altKey) { // ⌥-drag duplicates
          const map: Record<string, Rect> = {};
          for (const [id, p] of Object.entries(d.start)) {
            const src = st.notes[id]; const nid = `${id}-c${Date.now() % 100000}`;
            useStore.setState(s => ({ notes: { ...s.notes, [nid]: { ...src, id: nid, createdAt: Date.now() } }, order: [...s.order, nid] }));
            map[nid] = p;
          }
          d.startNotes = useStore.getState().notes; d.start = map; d.id = Object.keys(map)[Object.keys(d.start).indexOf(d.id)] ?? Object.keys(map)[0]; st.select(Object.keys(map));
        }
      }
      // shake: vertical shake → front, horizontal shake → back
      const sh = d.shake, now = performance.now();
      const mx = e.clientX - sh.lx, my = e.clientY - sh.ly; sh.lx = e.clientX; sh.ly = e.clientY;
      if (Math.abs(mx) > 6 && Math.sign(mx) !== Math.sign(sh.dx)) { sh.flipsX++; sh.dx = mx; }
      if (Math.abs(my) > 6 && Math.sign(my) !== Math.sign(sh.dy)) { sh.flipsY++; sh.dy = my; }
      if (now - sh.t > 700) { sh.t = now; sh.flipsX = 0; sh.flipsY = 0; }
      if (sh.flipsY >= 4) { st.reorder(Object.keys(d.start), 'front'); sh.flipsY = 0; sh.t = now; }
      if (sh.flipsX >= 4) { st.reorder(Object.keys(d.start), 'back'); sh.flipsX = 0; sh.t = now; }

      let dx = dxs / z, dy = dys / z;
      const previous = d.adaptive ?? null;
      d.adaptive = null;
      const under = document.elementsFromPoint(e.clientX, e.clientY).map(el => (el as HTMLElement).closest?.('[data-kind="folder"]') as HTMLElement | null).find(Boolean);
      const fid = under?.dataset.noteId;
      d.dropTarget = fid && !(fid in d.start) ? fid : null;
      setDropFolder(d.dropTarget);
      const origin = union(Object.values(d.start));
      const members = Object.entries(d.start).map(([id, r]) => ({ id, r: { ...r, x: r.x + dx, y: r.y + dy } }));
      const bounds = { ...origin, x: origin.x + dx, y: origin.y + dy };
      if (!e.shiftKey && st.prefs.magneticSnap && !d.dropTarget) {
        const neighbours = liveIds(st).filter(i => !(i in d.start));
        const others = neighbours.map(id => ({ id, r: rectOf(st.notes[id], st.sizes) }));
        const radius = st.prefs.snapRadius / z;
        if (st.prefs.adaptiveScale)
          d.adaptive = adaptiveSnap(members, others.filter(o => st.notes[o.id].type !== 'folder'), st.prefs.gap, radius, previous);
        if (d.adaptive) {
          dx = d.adaptive.dragX - origin.x; dy = d.adaptive.dragY - origin.y;
          setGuides([d.adaptive.guide]);
        } else {
          const result = snap(bounds, others.map(o => o.r), st.prefs.gap, radius, st.prefs.smartGuides);
          dx = result.x - origin.x; dy = result.y - origin.y;
          setGuides(result.guides);
        }
      } else setGuides([]);
      const patches: Record<string, any> = {};
      for (const [id, p] of Object.entries(d.start)) patches[id] = { canvasX: p.x + dx, canvasY: p.y + dy };
      st.updateMany(patches);
    }
  };

  const onUp = (e: React.PointerEvent) => {
    touches.current.delete(e.pointerId); if (touches.current.size < 2) pinch.current = null;
    if (e.type === 'pointerup' && drag.current?.kind === 'move' && drag.current.moved) onMove(e);
    const d = drag.current; drag.current = null;
    document.body.classList.remove('sr-space-active');
    const st = useStore.getState();
    if (!d) return;
    if (e.type === 'pointercancel' && (d.kind === 'resize' || d.kind === 'move' && d.moved)) {
      st.undo(); useStore.setState({ future: [] }); setDraggingId(null); setDropFolder(null); setGuides([]); return;
    }
    if (d.kind === 'marquee') {
      if (!marquee && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3 && !e.shiftKey) {
        st.select([]);
      }
      setMarquee(null); return;
    }
    if (d.kind === 'resize' && d.rotate) {
      const n = st.notes[d.id]; const ar = n.metadata.aspectRatio ?? 1; const w = noteWidth(n);
      st.update(d.id, { metadata: { rotation: ((n.metadata.rotation ?? 0) + 1) % 4, aspectRatio: 1 / ar, displayWidth: Math.round(w * ar) } });
      return;
    }
    if (d.kind === 'move') {
      setDraggingId(null); setGuides([]);
      if (!d.moved) {
        if (!e.shiftKey && !e.metaKey) st.select([d.id]);
        return;
      }
      if (d.dropTarget) {
        const ids = Object.keys(d.start);
        const patches: Record<string, any> = {};
        ids.forEach((i, k) => { patches[i] = { parentId: d.dropTarget, canvasX: d.start[i].x, canvasY: d.start[i].y, metadata: { dock: null } }; });
        st.updateMany(patches); st.select([]); setDropFolder(null);
        // New arrivals may be outside the folder's previous view; frame its contents on next entry.
        const folderCams = { ...st.folderCams }; delete folderCams[d.dropTarget];
        useStore.setState({ folderCams });
        st.setUI({ toast: `Moved ${ids.length} module${ids.length === 1 ? '' : 's'} into the folder` });
        return;
      }
      if (d.adaptive && !e.shiftKey) {
        const target = d.adaptive;
        animateSelection(Object.keys(d.start), () => st.updateMany(scaleSelection(d.startNotes, d.start, union(Object.values(d.start)), target, target.k)));
      }
      requestAnimationFrame(() => computeDocks(Object.keys(d.start)));
    }
  };

  const onContext = (e: React.MouseEvent) => {
    e.preventDefault();
    const w = toWorld(e.clientX, e.clientY);
    useStore.getState().setUI({ menu: { kind: 'canvas', sx: e.clientX, sy: e.clientY, wx: w.x, wy: w.y }, userMenu: false });
  };

  const transition = camAnim ? `transform ${camAnim}ms ${camAnim <= 60 ? 'linear' : 'cubic-bezier(0.22,1,0.36,1)'}` : 'none';
  const editingNow = useStore(s => s.ui.editingId);
  const focusId = editingNow ? null : hoverId ?? (menu?.kind === 'axis' ? menu.id : null);
  const hoverCluster = focusId ? groups.findIndex(g => g.ids.includes(focusId)) : -1;
  const axisOn = menu?.kind === 'axis';

  return (
    <div ref={vp} className="sr-viewport" data-canvas="true"
      onPointerDown={onBgDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onPointerLeave={() => useStore.getState().setHover(null)}
      onDoubleClick={e => {
        // pointer capture retargets click/dblclick to the viewport, so resolve the module under the pointer here
        const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest('[data-card]') as HTMLElement | null;
        const id = el?.dataset.noteId; if (id && useStore.getState().ui.editingId !== id) h.onDouble(e, id);
      }}
      onContextMenu={onContext}>
      {folder && ids.length === 0 && <div style={{ position: 'absolute', top: '45%', width: '100%', textAlign: 'center', color: 'var(--sr-muted)', pointerEvents: 'none' }}>
        <p>This folder is empty</p><p>Drop files here, or right-click to add a module.</p>
      </div>}
      <div className="sr-world" data-dim={axisOn ? 'true' : undefined}
        style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`, transition }}>
        <svg className="sr-clusters">
          {groups.map((g, i) => selectionBox && g.ids.some(id => selectedIds.includes(id)) ? null : <path key={g.ids.join()} d={g.d} className={i === hoverCluster || (draggingId && g.ids.includes(draggingId)) ? 'on' : ''} />)}
        </svg>
        {ids.map(id => <NoteView key={id} id={id} z={cam.z} h={h} dropTarget={dropFolder === id} dragging={!!draggingId && selectedIds.includes(id)} grouped={selectedIds.length > 1 && selectedIds.includes(id)} />)}
        {selectionBox && <>
          <svg className="sr-clusters sr-selection-hull"><path className="on" d={silhouettePath(selectionRects)} /></svg>
          <div className="sr-group-handles" data-group-selection="true" onPointerDown={e => h.onDown(e, selectedIds[0])} onContextMenu={e => h.onContext(e, selectedIds[0])} style={{ left: selectionBox.x - 12, top: selectionBox.y - 12, width: selectionBox.w + 24, height: selectionBox.h + 24 }}>
            <Arcs onDown={(e, corner) => {
              if (e.button !== 0) return;
              e.stopPropagation(); const st = useStore.getState(); st.checkpoint();
              st.setUI({ menu: null });
              drag.current = { kind: 'resize', id: selectedIds[0], corner, sx: e.clientX, sy: e.clientY, ...{ x: selectionBox.x, y: selectionBox.y, w: selectionBox.w, h: selectionBox.h }, scale: 1, rotate: false,
                group: { rects: Object.fromEntries(selectedIds.map(id => [id, rectOf(st.notes[id], st.sizes)])), notes: st.notes } };
              vp.current!.setPointerCapture(e.pointerId);
            }} />
          </div>
        </>}
        <svg className="sr-guides">{guides.map((g, i) => <line key={i} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} data-kind={g.kind} strokeWidth={(g.kind === 'dock' ? 2 : 1) / cam.z} />)}</svg>
      </div>
      {marquee && <div className="sr-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}
    </div>
  );
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const isTyping = (e: Event) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
};
