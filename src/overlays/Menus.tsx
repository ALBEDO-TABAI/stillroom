import React, { useRef } from 'react';
import { useStore, blankNote } from '../store/store';
import { Icon } from '../lib/icons';
import { btn } from '../lib/button';
import { from, useEscape } from '../lib/motion';
import { openFolder, moveOut } from '../canvas/folders';
import { toScreen } from '../canvas/camera';
import { refreshLinkPreview } from '../lib/linkPreview';
import { downloadSelection } from '../lib/selectionZip';
import { resetSelection, folderSelection } from '../canvas/selection';
import { rectOf, union } from '../lib/geometry';
import { ago, fmtBytes } from '../lib/time';
import { exportMd, exportPng, exportPdf } from '../lib/exporters';
import { addFiles, addTextOrLink, webLink } from '../lib/capture';

const AXIS_GAP = 12, CTX_R = 32;

export function CanvasMenu() {
  const menu = useStore(s => s.ui.menu);
  const setUI = useStore(s => s.setUI);
  const file = useRef<HTMLInputElement>(null);
  useEscape(() => setUI({ menu: null }), menu?.kind === 'canvas');
  if (menu?.kind !== 'canvas') return null;
  const { sx, sy, wx, wy } = menu;
  const close = () => setUI({ menu: null });
  const add = (type: 'text' | 'folder') => {
    const st = useStore.getState();
    const n = blankNote(type, wx - 130, wy - (type === 'folder' ? 130 : 33));
    if (type === 'folder') n.title = 'New Folder';
    else n.metadata = { titleLevel: 'p' }; // frameless paragraph text, caret in the title, "T" in the inline pill
    st.add(n, { select: true }); close();
    if (type === 'text') setUI({ editingId: n.id, menu: null });
  };
  return (
    <div className="sr-layer" style={{ zIndex: 500 }} onPointerDown={close} onContextMenu={e => { e.preventDefault(); close(); }}>
      <div className="sr-pass">
        <button title="Text" className={btn({ icon: true, surface: 'solid' }) + ' sr-in'} onPointerDown={e => e.stopPropagation()} onClick={() => add('text')}
          style={{ pointerEvents: 'auto', position: 'absolute', left: sx, top: sy - CTX_R, transform: 'translateX(-50%) translateY(-100%)', transformOrigin: 'center bottom', ...from({ y: 10 }) }}><Icon name="text" /></button>
        <button title="Link" className={btn({ icon: true, surface: 'solid' }) + ' sr-in'} onPointerDown={e => e.stopPropagation()} onClick={() => { setUI({ menu: null, linkInput: { wx, wy } }); }}
          style={{ pointerEvents: 'auto', position: 'absolute', left: sx + CTX_R, top: sy, transform: 'translateY(-50%)', transformOrigin: 'left center', ...from({ x: -10 }) }}><Icon name="link" /></button>
        <button title="Camera" className={btn({ icon: true, surface: 'solid' }) + ' sr-in'} onPointerDown={e => e.stopPropagation()} onClick={() => file.current?.click()}
          style={{ pointerEvents: 'auto', position: 'absolute', left: sx, top: sy + CTX_R, transform: 'translateX(-50%)', transformOrigin: 'center top', ...from({ y: -10 }) }}><Icon name="camera" /></button>
        <button title="Folder" className={btn({ icon: true, surface: 'solid' }) + ' sr-in'} onPointerDown={e => e.stopPropagation()} onClick={() => add('folder')}
          style={{ pointerEvents: 'auto', position: 'absolute', left: sx - CTX_R, top: sy, transform: 'translate(-100%, -50%)', transformOrigin: 'right center', ...from({ x: 10 }) }}><Icon name="folder" /></button>
        <input ref={file} type="file" accept="image/*,audio/*" capture="environment" multiple hidden
          onChange={e => { if (e.target.files) addFiles([...e.target.files], { x: wx, y: wy }); close(); }} />
      </div>
    </div>
  );
}

export function AxisMenu() {
  const menu = useStore(s => s.ui.menu);
  const dl = useStore(s => s.ui.axisDownload);
  const selected = useStore(s => s.selected);
  const infoId = useStore(s => s.ui.infoId);
  const setUI = useStore(s => s.setUI);
  useStore(s => s.cam);
  const id = menu?.kind === 'axis' ? menu.id : null;
  const note = useStore(s => (id ? s.notes[id] : null));
  useEscape(() => { if (infoId) setUI({ infoId: null }); else if (dl) setUI({ axisDownload: false }); else setUI({ menu: null }); }, !!id);
  if (!id || !note) return null;
  const st = useStore.getState();
  const ids = (selected.includes(id) ? selected : [id]).filter(i => st.notes[i] && !st.notes[i].deletedAt && (st.notes[i].parentId ?? null) === st.ui.openFolderId);
  const multiple = ids.length > 1;
  const zipped = multiple || note.type === 'folder';
  const r = multiple ? union(ids.map(i => rectOf(st.notes[i], st.sizes))) : rectOf(note, st.sizes);
  const start = toScreen(r.x, r.y), end = toScreen(r.x + r.w, r.y + r.h);
  const a = { x: Math.max(120, start.x), y: Math.max(120, start.y) };
  const b = { x: Math.min(innerWidth - 140, end.x), y: Math.min(innerHeight - 84, end.y) };
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
  const close = () => setUI({ menu: null, axisDownload: false, infoId: null });
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  if (infoId === id) {
    const rows: string[] = multiple ? [`${ids.length} selected modules`, ...Object.entries(ids.reduce<Record<string, number>>((counts, i) => { const type = st.notes[i].type; counts[type] = (counts[type] || 0) + 1; return counts; }, {})).map(([type, count]) => `${count} ${type}`)] : [ago(note.createdAt)];
    if (!multiple && note.metadata.originalFilename) rows.push(note.metadata.originalFilename);
    if (!multiple && note.metadata.fileSize) rows.push(fmtBytes(note.metadata.fileSize));
    if (!multiple && (note.type === 'audio' || note.type === 'video')) rows.push(note.duration ?? '');
    if (!multiple && note.type === 'link') rows.push(note.metadata.domain ?? '');
    return (
      <div className="sr-layer" style={{ zIndex: 650 }} onPointerDown={close} onContextMenu={e => { e.preventDefault(); close(); }}>
        <div className="sr-in" onPointerDown={stop} style={{ position: 'fixed', left: Math.max(14, a.x - 3 - 200), top: cy, transform: 'translateY(-50%)', width: 200, boxSizing: 'border-box', background: 'var(--sr-glass)', backdropFilter: 'var(--sr-blur)', WebkitBackdropFilter: 'var(--sr-blur)', borderRadius: 18, padding: '16px 18px', color: 'var(--sr-text)', textAlign: 'right', ...from({ x: 8 }) }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.03em', color: 'var(--sr-muted)', marginBottom: 5 }}>Module Info</div>
          {rows.filter(Boolean).map((t, i) => <div key={i} style={{ padding: '6px 0', fontSize: 14, lineHeight: 1.35, fontWeight: 500, overflowWrap: 'anywhere' }}>{t}</div>)}
        </div>
      </div>
    );
  }
  const solid = btn({ surface: 'solid' }) + ' sr-in';
  const dlBtn = (label: string, area: string, extra: React.CSSProperties, fn: () => void) => (
    <button className={solid} style={{ gridArea: area, whiteSpace: 'nowrap', minWidth: 60, ...extra }} onClick={() => { fn(); close(); }}>{label}</button>
  );
  return (
    <div className="sr-layer" onPointerDown={close} onContextMenu={e => { e.preventDefault(); close(); }}>
      <div className="sr-pass">
        <div onPointerDown={stop} style={{ pointerEvents: 'auto', position: 'absolute', left: cx, top: a.y - AXIS_GAP, transform: 'translateX(-50%) translateY(-100%)', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
          {zipped ? <>
          {!multiple && <button className={solid} style={{ gridArea: '1 / 1' }} onClick={() => openFolder(id)}>Open folder</button>}
          <button className={solid} style={{ gridArea: '1 / 2' }} onClick={() => { void downloadSelection(ids); close(); }}><Icon name="download" />Download ZIP{multiple ? ` (${ids.length})` : ''}</button>
          </> : <>
          <button className={solid} aria-expanded={dl} style={{ gridArea: dl ? '2 / 2' : '1 / 2', ...from({ y: 10 }) }} onClick={() => setUI({ axisDownload: !dl })}><Icon name="download" />Download</button>
          {note.type === 'link' && !dl && <button className={solid} style={{ gridArea: '1 / 3' }} title="Refresh preview" aria-label="Refresh preview" onClick={() => { close(); useStore.getState().setUI({ toast: 'Refreshing preview…' }); void refreshLinkPreview(id, true).then(ok => useStore.getState().setUI({ toast: ok ? 'Preview refreshed' : 'This site did not provide a preview' })); }}><Icon name="restore" /></button>}
          {dl && dlBtn('.png', '2 / 1', { justifySelf: 'end', ...from({ x: 10 }) }, () => exportPng(note))}
          {dl && dlBtn('.md', '1 / 2', { justifySelf: 'center', ...from({ y: 10 }) }, () => exportMd(note))}
          {dl && dlBtn('.pdf', '2 / 3', { justifySelf: 'start', ...from({ x: -10 }) }, () => exportPdf(note))}</>}
        </div>
        <button className={solid} onPointerDown={stop} onClick={() => setUI({ infoId: id })}
          style={{ pointerEvents: 'auto', position: 'absolute', left: a.x - AXIS_GAP, top: cy, transform: 'translate(-100%, -50%)', transformOrigin: 'right center', ...from({ x: 10 }) }}><Icon name="info" />Info</button>
        {multiple ? <button className={solid} onPointerDown={stop} title="Restore positions and sizes before automatic alignment or group resizing"
          disabled={!ids.some(i => st.notes[i].metadata.layoutBefore)} onClick={() => { resetSelection(ids); close(); }}
          style={{ pointerEvents: 'auto', position: 'absolute', left: b.x + AXIS_GAP, top: cy, transform: 'translateY(-50%)', ...from({ x: -10 }) }}><Icon name="restore" />Reset</button> :
        <button className={solid} onPointerDown={stop} onClick={() => { if (note.parentId) moveOut(ids); else shareOnX(note); close(); }}
          style={{ pointerEvents: 'auto', position: 'absolute', left: b.x + AXIS_GAP, top: cy, transform: 'translateY(-50%)', ...from({ x: -10 }) }}>{note.parentId ? 'Move out of folder' : <><Icon name="share" />Share on X</>}</button>}
        {multiple && <button className={solid} onPointerDown={stop} onClick={() => { folderSelection(ids); close(); }}
          style={{ pointerEvents: 'auto', position: 'absolute', left: cx - 120, top: b.y + AXIS_GAP, transform: 'translateX(-50%)', ...from({ y: -10 }) }}><Icon name="folder" />Folder</button>}
        <button className={btn({ surface: 'solid', destructive: true }) + ' sr-in'} onPointerDown={stop} onClick={() => { useStore.getState().remove(ids); close(); }}
          style={{ pointerEvents: 'auto', position: 'absolute', left: cx, top: b.y + AXIS_GAP, transform: 'translateX(-50%)', transformOrigin: 'center top', ...from({ y: -10 }) }}><Icon name="trash" />Delete</button>
      </div>
    </div>
  );
}

/** Opens X's public compose intent in a new tab — nothing is posted unless the person posts it there. */
function shareOnX(n: { title: string; text: string; metadata: { url?: string } }) {
  const body = (n.title + (n.text ? ' — ' + n.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '')).slice(0, 240);
  const u = new URL('https://x.com/intent/post');
  u.searchParams.set('text', body);
  if (n.metadata.url) u.searchParams.set('url', n.metadata.url);
  window.open(u.toString(), '_blank', 'noopener');
}

export function LinkInput() {
  const li = useStore(s => s.ui.linkInput);
  const setUI = useStore(s => s.setUI);
  useEscape(() => setUI({ linkInput: null }), !!li);
  if (!li) return null;
  const p = toScreen(li.wx, li.wy);
  return (
    <div className="sr-layer" onPointerDown={() => setUI({ linkInput: null })}>
      <form className="sr-linkinput sr-in" style={{ left: p.x, top: p.y, ...from({ s: 0.96 }) }} onPointerDown={e => e.stopPropagation()}
        onSubmit={e => {
          e.preventDefault();
          const v = (new FormData(e.currentTarget).get('u') as string).trim(); if (!v) return;
          const url = webLink(v);
          if (!url) { setUI({ toast: 'Enter a valid web link' }); return; }
          addTextOrLink(url, { x: li.wx, y: li.wy });
          setUI({ linkInput: null });
        }}>
        <input name="u" autoFocus placeholder="Paste a link" onKeyDown={e => e.stopPropagation()} />
      </form>
    </div>
  );
}
