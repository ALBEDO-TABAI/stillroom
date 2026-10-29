import React, { useEffect, useRef, useState } from 'react';
import type { Note } from '../store/types';
import { resolveMedia, resolveSync } from '../store/blobs';
import { useStore } from '../store/store';
import { Icon } from '../lib/icons';

export function useMedia(ref?: string) {
  const [u, setU] = useState(() => resolveSync(ref));
  useEffect(() => { let live = true; resolveMedia(ref).then(x => live && setU(x)); return () => { live = false; }; }, [ref]);
  return u;
}

export function ImageCard({ note, w }: { note: Note; w: number }) {
  const src = useMedia(note.mediaUrl);
  const rounded = useStore(s => s.prefs.imageRounded);
  const m = note.metadata;
  const rot = ((m.rotation ?? 0) % 4 + 4) % 4;
  const h = Math.round(w * (m.aspectRatio ?? 0.75));
  const pos = m.crop ? `${m.crop.x}% ${m.crop.y}%` : '50% 50%';
  const imgStyle: React.CSSProperties = rot % 2
    ? { width: h, height: w, left: (w - h) / 2, top: (h - w) / 2, transform: `rotate(${rot * 90}deg)`, objectPosition: pos }
    : { transform: rot ? `rotate(${rot * 90}deg)` : undefined, objectPosition: pos };
  return (
    <div className="sr-media" style={{ width: w, height: h, ['--sr-media-r' as any]: rounded ? '24px' : '0px' }}>
      {src && <img className="sr-under" src={src} alt="" draggable={false} style={imgStyle} />}
      {src && <img src={src} alt={note.title} draggable={false} style={imgStyle} />}
    </div>
  );
}

export function VideoCard({ note, w }: { note: Note; w: number }) {
  const src = useMedia(note.mediaUrl);
  const poster = useMedia(note.metadata.poster);
  const rounded = useStore(s => s.prefs.imageRounded);
  const h = Math.round(w * (note.metadata.aspectRatio ?? 0.5625));
  const v = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="sr-media" style={{ width: w, height: h, ['--sr-media-r' as any]: rounded ? '24px' : '0px' }}>
      {src && <video ref={v} src={src} poster={poster} muted loop playsInline preload="metadata" onEnded={() => setPlaying(false)} />}
      <button className={'sr-play sr-center-play' + (playing ? ' is-on' : '')} onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); const el = v.current; if (!el) return; if (el.paused) { el.play(); setPlaying(true); } else { el.pause(); setPlaying(false); } }}>
        <Icon name={playing ? 'pause' : 'play'} />
      </button>
      <div className="sr-badge"><Icon name="video" size={12} />{note.duration ?? ''}</div>
    </div>
  );
}

export function LinkCard({ note }: { note: Note }) {
  const m = note.metadata;
  const domain = m.domain ?? (() => { try { return new URL(m.url ?? note.title).hostname; } catch { return note.title; } })();
  const img = useMedia(m.linkImage);
  if (img) return (
    // Cover style (measured): dark base, cover image, a 22px backdrop blur masked up to 73% height, white title.
    <div className="sr-link sr-link--cover">
      <div className="sr-link-bg" style={{ background: '#141414' }} />
      <img className="sr-link-img" src={img} alt="" draggable={false} />
      <div className="sr-link-veil" />
      <div className="sr-link-cap">
        <div className="sr-link-ctitle">{m.linkTitle || domain}</div>
        <div className="sr-link-crow"><span className="sr-favicon" style={{ width: 13, height: 13, borderRadius: 4 }}>{(domain[0] || '?').toUpperCase()}</span><span className="sr-domain sr-domain--cover">{domain}</span></div>
      </div>
    </div>
  );
  return (
    <div className="sr-link">
      <div className="sr-link-bg" />
      <div className="sr-link-meta">
        <div className="sr-link-title">{m.linkTitle || domain}</div>
        <div className="sr-link-row">
          <span className="sr-favicon">{(domain[0] || '?').toUpperCase()}</span>
          <span className="sr-domain">{domain}</span>
        </div>
      </div>
    </div>
  );
}

export function FolderCard({ note, count, drop, thumbs }: { note: Note; count: number; drop: boolean; thumbs: string[] }) {
  const label = `${count} module${count === 1 ? '' : 's'}`;
  return (
    <div className="sr-folder" data-drop={drop ? 'true' : undefined}
      onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`); e.currentTarget.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`); }}>
      {thumbs.length > 0 && <div className="sr-folder-thumbs">{thumbs.slice(0, 4).map((t, i) => <Thumb key={i} r={t} />)}</div>}
      <div aria-hidden="true" style={{ fontSize: 11, marginBottom: 4, textAlign: 'center', visibility: 'hidden', padding: '0 12px', lineHeight: 1.3, position: 'relative' }}>{label}</div>
      <div className="sr-folder-title" data-folder-title="true" style={{ position: 'relative', zIndex: 1 }}><span>{note.title || 'Folder'}</span></div>
      <div className="sr-folder-count" style={{ position: 'relative', zIndex: 1 }}>{label}</div>
    </div>
  );
}
function Thumb({ r }: { r: string }) { const u = useMedia(r); return u ? <img src={u} alt="" /> : null; }
