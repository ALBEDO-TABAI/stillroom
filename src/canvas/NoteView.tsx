import React, { useLayoutEffect, useRef } from 'react';
import { useStore } from '../store/store';
import { noteWidth, isPacked, hasBody } from '../lib/geometry';
import { TextCard } from '../cards/TextCard';
import { ImageCard, LinkCard, FolderCard, VideoCard } from '../cards/MediaCards';
import { Arcs, Edges, type Corner } from '../cards/Arcs';
import { useAudio, toggleAudio } from '../store/audio';
import { Icon } from '../lib/icons';

/** Inline-edit chrome (signed-in reference): a format pill 39 world-px above the module and a
 *  Contain/Unpack pill 39 below, both in world space so they scale with the canvas. */
function InlineBar({ id }: { id: string }) {
  const note = useStore(s => s.notes[id]);
  const update = useStore(s => s.update);
  const setUI = useStore(s => s.setUI);
  const m = note.metadata;
  const set = (meta: Partial<typeof m>) => { useStore.getState().checkpoint(); update(id, { metadata: { ...m, ...meta } }); };
  const hasList = /<ul|<ol/.test(note.text);
  const align = m.titleAlign ?? (isPacked(note) || m.titleLevel === 'p' ? 'left' : 'center');
  const nextAlign = ({ left: 'center', center: 'right', right: 'left' } as const)[align];
  const weights = ['light', 'regular', 'medium'] as const;
  const wNow = m.titleWeight ?? 'regular';
  const stop = (e: React.PointerEvent | React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); };
  const B = ({ title, on = true, onClick, children }: { title: string; on?: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" className="sr-ibtn" title={title} style={{ opacity: on ? 1 : 0.45 }} onPointerDown={stop} onMouseDown={stop} onClick={e => { e.stopPropagation(); onClick(); }}>{children}</button>
  );
  return (
    <>
      <div className="sr-inline-top" onPointerDown={e => e.stopPropagation()}>
        <div className="sr-inline-pill sr-in sr-in--chrome">
          <B title="Text level" onClick={() => set(m.titleLevel === 'p' ? { titleLevel: undefined } : (m.titleFontScale ?? 1) >= 1.9 ? { titleFontScale: 1, titleLevel: 'p' } : { titleFontScale: 2 })}>{m.titleLevel === 'p'
            ? <span style={{ fontSize: 17, fontWeight: 500 }}>T</span>
            : <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>H<span style={{ fontSize: 11 }}>1</span></span>}</B>
          <B title="Block" on={false} onClick={() => { useStore.getState().checkpoint(); update(id, { text: hasList ? note.text.replace(/<\/?ul>|<\/?li>/g, '') : '<ul><li>' + (note.text || '<p></p>') + '</li></ul>' }); }}><Icon name="list" size={20} /></B>
          <B title={wNow[0].toUpperCase() + wNow.slice(1)} onClick={() => set({ titleWeight: weights[(weights.indexOf(wNow as any) + 1) % 3] })}><span style={{ fontWeight: wNow === 'light' ? 300 : wNow === 'medium' ? 500 : 400, fontSize: 16 }}>A</span></B>
          <B title={'Align ' + align} onClick={() => set({ titleAlign: nextAlign })}><Icon name={align === 'center' ? 'alignCenter' : align === 'right' ? 'alignRight' : 'align'} size={20} /></B>
          <B title="More" onClick={() => setUI({ editingId: null, editorId: id })}><Icon name="more" size={20} /></B>
        </div>
      </div>
      <div className="sr-inline-bottom" title={isPacked(note) ? 'Unpack' : 'Contain'} onPointerDown={stop}
        onClick={e => { e.stopPropagation(); set({ packed: !isPacked(note) }); }}>
        <Icon name={isPacked(note) ? 'expand' : !note.title && !hasBody(note.text) ? 'frame' : 'collapse'} size={20} />
      </div>
    </>
  );
}

export type CardHandlers = {
  onDown: (e: React.PointerEvent, id: string) => void;
  onArc: (e: React.PointerEvent, id: string, c: Corner) => void;
  onEdge: (e: React.PointerEvent, id: string, side: 'l' | 'r' | 't' | 'b') => void;
  onDouble: (e: React.MouseEvent, id: string) => void;
  onContext: (e: React.MouseEvent, id: string) => void;
};

export const NoteView = React.memo(function NoteView({ id, z, h, dropTarget, dragging }: { id: string; z: number; h: CardHandlers; dropTarget: boolean; dragging: boolean }) {
  const note = useStore(s => s.notes[id]);
  const selected = useStore(s => s.selected.includes(id));
  const editing = useStore(s => s.ui.editingId === id);
  const axis = useStore(s => s.ui.menu?.kind === 'axis' && s.ui.menu.id === id);
  const inWindow = useStore(s => s.ui.editorId === id);
  const dark = useStore(s => s.prefs.dark);
  const folderInfo = useStore(s => {
    if (note?.type !== 'folder') return '';
    const kids = Object.values(s.notes).filter(n => n.parentId === id && !n.deletedAt);
    return JSON.stringify([kids.length, kids.filter(k => k.type === 'image').map(k => k.mediaUrl)]);
  });
  const playing = useAudio(s => s.id === id && s.playing);
  const ref = useRef<HTMLDivElement>(null);
  const setSize = useStore(s => s.setSize);

  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize(id, el.offsetWidth, el.offsetHeight));
    ro.observe(el); setSize(id, el.offsetWidth, el.offsetHeight);
    return () => ro.disconnect();
  }, [id, setSize]);

  if (!note) return null;
  const w = noteWidth(note);
  const kind = note.type;
  const unpacked = kind === 'text' && !isPacked(note);
  let body: React.ReactNode;
  if (kind === 'image') body = <ImageCard note={note} w={w} />;
  else if (kind === 'video') body = <VideoCard note={note} w={w} />;
  else if (kind === 'link') body = <LinkCard note={note} />;
  else if (kind === 'folder') {
    const [count, thumbs] = folderInfo ? JSON.parse(folderInfo) : [0, []];
    body = <FolderCard note={note} count={count} drop={dropTarget} thumbs={thumbs} />;
  } else body = <TextCard note={note} editing={editing} playing={playing} onPlay={() => toggleAudio(id, note.audioUrl)} />;

  const arcRgb = kind === 'image' || kind === 'video' || dark ? '255,255,255' : '0,0,0';
  return (
    <div className="sr-note" style={{ left: note.canvasX, top: note.canvasY, width: w }}>
      <div
        ref={ref}
        data-card="true"
        data-note-id={id}
        data-kind={kind}
        data-selected={selected ? 'true' : undefined}
        data-editing={editing ? 'true' : undefined}
        data-axis={axis ? 'true' : undefined}
        data-in-window={inWindow ? 'true' : undefined}
        data-dragging={dragging ? 'true' : undefined}
        style={{ cursor: kind === 'folder' ? 'default' : editing ? 'auto' : undefined, ['--sr-arc-rgb' as any]: arcRgb, zIndex: axis ? 2 : 1 }}
        onPointerDown={e => h.onDown(e, id)}
        onContextMenu={e => h.onContext(e, id)}
      >
        {body}
        {kind !== 'folder' && <Arcs onDown={(e, c) => h.onArc(e, id, c)} />}
        {unpacked && <Edges inset={28} onDown={(e, s) => h.onEdge(e, id, s)} />}
        <div className="sr-sel" data-selection-outline="true" />
      </div>
      {editing && kind === 'text' && <InlineBar id={id} />}
    </div>
  );
});
