import React, { useEffect, useMemo, useState } from 'react';
import { useStore, liveIds } from '../store/store';
import { useEscape } from '../lib/motion';
import { useMedia } from '../cards/MediaCards';
import { rectOf } from '../lib/geometry';

/** Slideshow: the picture alone over the blurred canvas. ←/→ (or space) step, Esc or a click closes. */
export function Slideshow() {
  const id = useStore(s => s.ui.slideshowId);
  const notes = useStore(s => s.notes);
  const order = useStore(s => s.order);
  const setUI = useStore(s => s.setUI);
  const list = useMemo(() => {
    const st = useStore.getState();
    return liveIds({ notes, order }).filter(i => notes[i].type === 'image' || notes[i].type === 'video')
      .sort((a, b) => { const ra = rectOf(notes[a], st.sizes), rb = rectOf(notes[b], st.sizes); return Math.round(ra.y / 200) - Math.round(rb.y / 200) || ra.x - rb.x; });
  }, [notes, order]);
  useEscape(() => setUI({ slideshowId: null }), !!id);
  const i = id ? list.indexOf(id) : -1;
  const go = (d: number) => { if (list.length) setUI({ slideshowId: list[(i + d + list.length) % list.length] }); };
  useEffect(() => {
    if (!id) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(-1); }
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });
  if (!id || !notes[id]) return null;
  return (
    <div className="sr-slideshow" onClick={() => setUI({ slideshowId: null })}
      onWheel={e => { if (Math.abs(e.deltaX) > 30 || Math.abs(e.deltaY) > 30) go(e.deltaX + e.deltaY > 0 ? 1 : -1); }}>
      <Slide id={id} />
    </div>
  );
}
function Slide({ id }: { id: string }) {
  const n = useStore(s => s.notes[id]);
  const src = useMedia(n.mediaUrl);
  const [vw, setVw] = useState({ w: innerWidth, h: innerHeight });
  useEffect(() => { const f = () => setVw({ w: innerWidth, h: innerHeight }); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  const ar = n.metadata.aspectRatio ?? 0.75; // h / w
  let h = vw.h * 0.8, w = h / ar;
  if (w > vw.w * 0.8) { w = vw.w * 0.8; h = w * ar; }
  const rot = ((n.metadata.rotation ?? 0) % 4) * 90;
  if (!src) return null;
  return (
    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: '50%', top: '50%', width: w, height: h, transform: 'translate(-50%, -50%)' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {n.type === 'video'
          ? <video key={id} src={src} controls autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <img key={id} src={src} alt={n.title} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: rot ? `rotate(${rot}deg)` : undefined }} />}
      </div>
    </div>
  );
}
