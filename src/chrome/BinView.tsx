import React, { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/store';
import { TextCard } from '../cards/TextCard';
import { ImageCard, VideoCard, LinkCard, FolderCard } from '../cards/MediaCards';
import { btn } from '../lib/button';
import { Icon } from '../lib/icons';
import { ago } from '../lib/time';

// Bin mode (measured on a signed-in account with items): a full-width CSS multi-column masonry —
// `columns: 260px; column-gap: 4px`, padding 56/14/120, items margin-bottom 4, binned cards at opacity .6.
// Right-click an item: it comes to full opacity, the rest blur away, and a solid "Restore" pill sits 12px below it.
const MINCOL = 260, GAP = 4, PAD = 14;

export function BinView() {
  const q = useStore(s => s.ui.search.trim().toLowerCase());
  const binned = useStore(useShallow(s => Object.values(s.notes).filter(n => n.deletedAt && !(n.parentId && s.notes[n.parentId]?.deletedAt)).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))));
  const shown = useMemo(() => binned.filter(n => !q || (n.title + ' ' + n.text + ' ' + (n.metadata.linkTitle ?? '')).toLowerCase().includes(q)), [binned, q]);
  const restore = useStore(s => s.restore);
  const [focus, setFocusRaw] = useState<string | null>(null);
  const [info, setInfo] = useState(false);
  const setFocus = (v: string | null) => { setFocusRaw(v); setInfo(false); };
  const [vw, setVw] = useState(innerWidth);
  useEffect(() => { const f = () => setVw(innerWidth); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  const inner = vw - 2 * PAD;
  const n = Math.max(1, Math.floor((inner + GAP) / (MINCOL + GAP)));
  const colW = (inner - (n - 1) * GAP) / n;
  return (
    <div className="sr-binview" data-bin-view="true" onPointerDown={e => { if (!(e.target as HTMLElement).closest('.sr-bin-restore')) setFocus(null); }} onContextMenu={e => e.preventDefault()}>
      <div style={{ margin: '0 auto', padding: `56px ${PAD}px 120px`, boxSizing: 'border-box' }}>
        <div style={{ columns: `${MINCOL}px`, columnGap: GAP }}>
          {shown.map(nn => (
            <div key={nn.id} style={{ borderRadius: 24, marginBottom: GAP, breakInside: 'avoid', position: 'relative' }}>
              <div className="sr-bin-item" data-card="true" data-note-id={nn.id} data-focus={focus === nn.id || undefined} data-dim={(focus && focus !== nn.id) || undefined}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setFocus(nn.id); }}
                style={{ width: colW, position: 'relative', borderRadius: 24 }}>
                {nn.type === 'image' ? <ImageCard note={nn} w={colW} /> : nn.type === 'video' ? <VideoCard note={nn} w={colW} /> : nn.type === 'link' ? <LinkCard note={nn} /> : nn.type === 'folder' ? <FolderCard note={nn} count={0} drop={false} thumbs={[]} /> : <TextCard note={nn} editing={false} />}
              </div>
              {focus === nn.id && (
                <div className="sr-bin-restore" style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', marginTop: -GAP / 2, transform: 'translateY(-50%)', zIndex: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {info && <div className="sr-in" style={{ width: 200, boxSizing: 'border-box', background: 'var(--sr-glass)', backdropFilter: 'var(--sr-blur)', borderRadius: 18, padding: '16px 18px', color: 'var(--sr-text)', textAlign: 'right', fontSize: 14, fontWeight: 500 }}>
                    <div style={{ fontSize: 11, color: 'var(--sr-muted)', marginBottom: 5 }}>Module Info</div>{ago(nn.createdAt)}</div>}
                  <button className={btn({ surface: 'solid' })} onClick={() => setInfo(v => !v)}><Icon name="info" />Info</button>
                </div>
              )}
              {focus === nn.id && (
                <div className="sr-bin-restore" style={{ position: 'absolute', left: '50%', top: '100%', marginTop: 12 - GAP, transform: 'translateX(-50%)', zIndex: 40 }}>
                  <button className={btn({ surface: 'solid' })} onClick={() => { restore([nn.id]); setFocus(null); }}><Icon name="trash" />Restore</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
