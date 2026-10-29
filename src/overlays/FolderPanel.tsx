import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import { useStore } from '../store/store';
import { Icon } from '../lib/icons';
import { btn } from '../lib/button';
import { from, useEscape } from '../lib/motion';
import { useMedia } from '../cards/MediaCards';
import { toWorld } from '../canvas/camera';

/** Opening a folder: its modules, with a way to take each one back out onto the canvas. */
export function FolderPanel() {
  const id = useStore(s => s.ui.openFolderId);
  const folder = useStore(s => (id ? s.notes[id] : null));
  const kids = useStore(useShallow(s => Object.values(s.notes).filter(n => n.parentId === id && !n.deletedAt)));
  const setUI = useStore(s => s.setUI);
  const update = useStore(s => s.update);
  useEscape(() => setUI({ openFolderId: null }), !!id);
  if (!id || !folder) return null;
  const takeOut = (cid: string, i: number) => {
    const c = toWorld(innerWidth / 2, innerHeight - 160);
    useStore.getState().checkpoint();
    update(cid, { parentId: null, canvasX: Math.round(c.x - 130 + i * 24), canvasY: Math.round(c.y) });
  };
  return (
    <div className="sr-panel sr-folderpanel sr-in" style={from({ s: 0.97 })} onPointerDown={e => e.stopPropagation()}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <input defaultValue={folder.title} onKeyDown={e => e.stopPropagation()} onBlur={e => update(id, { title: e.target.value })}
          style={{ font: '500 18px/1.2 inherit', fontFamily: 'inherit', letterSpacing: '-0.014em', background: 'transparent', border: 'none', outline: 'none', color: 'var(--sr-text)', flex: 1 }} />
        <button className={btn({ icon: true, surface: 'ghost' })} onClick={() => setUI({ openFolderId: null })} title="Close (Esc)"><Icon name="close" /></button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--sr-muted)' }}>{kids.length} module{kids.length === 1 ? '' : 's'}{kids.length ? ' · double-click one to take it out' : ' · drag modules onto the folder to put them in'}</div>
      <div className="grid">{kids.map((k, i) => <Tile key={k.id} n={k} onOut={() => takeOut(k.id, i)} />)}</div>
    </div>
  );
}
function Tile({ n, onOut }: { n: any; onOut: () => void }) {
  const src = useMedia(n.type === 'video' ? n.metadata.poster : n.mediaUrl);
  return (
    <div className="tile" onDoubleClick={onOut} title="Double-click to take out">
      {src ? <img src={src} alt="" /> : <div style={{ fontWeight: 500 }}>{n.title || n.metadata.domain || n.type}</div>}
    </div>
  );
}
