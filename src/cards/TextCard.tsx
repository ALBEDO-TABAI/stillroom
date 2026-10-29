import React, { useEffect, useRef } from 'react';
import type { Note } from '../store/types';
import { isPacked, hasBody } from '../lib/geometry';
import { ago } from '../lib/time';
import { useStore } from '../store/store';
import { Icon } from '../lib/icons';
import { useAudio } from '../store/audio';

const WEIGHT = { light: 300, regular: 400, medium: 400, bold: 500 } as const;

export function TextCard({ note, editing, playing, onPlay }: { note: Note; editing: boolean; playing?: boolean; onPlay?: () => void }) {
  const m = note.metadata;
  const scale = m.titleFontScale ?? 1;
  const packed = isPacked(note) || note.type === 'audio';
  const titleRef = useRef<HTMLDivElement>(null);
  const update = useStore(s => s.update);

  useEffect(() => {
    if (editing && titleRef.current) {
      const el = titleRef.current; el.focus();
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const sel = getSelection(); sel?.removeAllRanges(); sel?.addRange(r);
    }
  }, [editing]);

  const commit = () => {
    const t = titleRef.current?.innerText.replace(/\n+$/, '') ?? '';
    if (t !== note.title) update(note.id, { title: t });
  };

  if (m.transcribing) return <Transcribing />;

  const style: any = {
    '--sr-title-fs': `${18 * scale}px`, '--sr-body-fs': `${12 * scale}px`, '--sr-title-gap': packed || hasBody(note.text) ? '12px' : '0px',
    ...(packed ? { maxHeight: note.type === 'audio' ? undefined : 195 } : { minHeight: m.frameH ?? 66, ...(m.frameH ? { justifyContent: 'flex-start' } : {}) }),
    ...(note.type === 'audio' ? { paddingBottom: 52 } : {}),
  };

  return (
    <div className={'sr-card' + (m.cooling ? ' sr-cooling' : '')} data-unpacked={packed ? undefined : 'true'} data-editing={editing ? 'true' : undefined} style={style}>
      <div className="sr-card-bg" />
      <div style={packed ? { position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' } : { position: 'relative', zIndex: 1 }}>
        <div
          ref={titleRef}
          data-note-title="true"
          className="sr-title sr-prose"
          contentEditable={editing ? 'plaintext-only' as any : false}
          suppressContentEditableWarning
          onBlur={commit}
          onKeyDown={e => {
            if (!editing) return;
            e.stopPropagation();
            if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) { e.preventDefault(); (e.target as HTMLElement).blur(); useStore.getState().setUI({ editingId: null }); }
          }}
          style={{ textAlign: m.titleAlign ?? (packed ? 'left' : 'center'), fontWeight: WEIGHT[m.titleWeight ?? 'regular'], ...(packed ? { maxHeight: 137, overflow: 'hidden' } : {}) }}
        >{editing ? note.title : <span>{note.title || (editing ? '' : '\u00a0')}</span>}</div>
        {note.type !== 'audio' && (packed || hasBody(note.text)) && (
          <div style={packed ? { position: 'relative', zIndex: 1, flex: '1 1 auto', minHeight: 0, overflow: 'hidden', marginTop: 0 } : { position: 'relative', zIndex: 1, marginTop: 12 * scale * 0.7 }}>
            <div data-note-body="true" className="sr-body sr-prose" style={packed ? undefined : { fontSize: 'var(--sr-body-fs)' }} dangerouslySetInnerHTML={{ __html: note.text.startsWith('<') ? note.text : `<p>${note.text}</p>` }} />
          </div>
        )}
        {note.type === 'audio' && <VoiceBody note={note} playing={!!playing} />}
        {packed && note.type !== 'audio' && <div className="sr-time"><span>{ago(note.createdAt)}</span></div>}
      </div>
      {note.type === 'audio' && (
        <button className={'sr-play' + (playing ? ' is-on' : '')} data-card-play="true" title={note.duration}
          onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onPlay?.(); }}>
          <Icon name={playing ? 'pause' : 'play'} />
        </button>
      )}
    </div>
  );
}

function VoiceBody({ note, playing }: { note: Note; playing: boolean }) {
  const bars = 38;
  const seed = [...note.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const prog = useAudio(s => (s.id === note.id ? s.progress : 0));
  return (
    <>
      {note.text && <div data-note-body="true" className="sr-body sr-prose" style={{ maxHeight: 70, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: note.text }} />}
      <div className="sr-wave" aria-hidden="true">
        {Array.from({ length: bars }, (_, i) => {
          const h = 4 + Math.abs(Math.sin(seed * 0.37 + i * 1.7) * Math.cos(i * 0.45)) * 18;
          return <i key={i} className={playing && i / bars <= prog ? 'on' : ''} style={{ height: h }} />;
        })}
      </div>
      <div className="sr-voice-meta"><span>{note.duration ?? '0:00'}</span><span>{ago(note.createdAt)}</span></div>
    </>
  );
}

// Transcription in progress (measured): an orange radial "breathes" (blur 28↔50px, 2s), and a centred title cycles a
// phrase every 3s, each letter pulsing (dotPulse 1.4s, .05s stagger).
const PHRASES = ['Capturing thoughts', 'Distilling voice', 'Extracting words', 'Decoding speech', 'Unfolding ideas', 'Processing waves', 'Shaping modules', 'Translating voice', 'Absorbing audio', 'Weaving transcript'];
function Transcribing() {
  const [i, setI] = React.useState(0);
  useEffect(() => { const t = setInterval(() => setI(v => (v + 1) % PHRASES.length), 3000); return () => clearInterval(t); }, []);
  const txt = PHRASES[i] + '...';
  return (
    <div className="sr-card sr-transcribing" style={{ minHeight: 166, justifyContent: 'center' } as any}>
      <div className="sr-breathe" />
      <div data-note-title="true" className="sr-title" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        {[...txt].map((c, k) => <span key={i + '-' + k} className="sr-tl" style={{ animationDelay: `${k * 0.05}s` }}>{c === ' ' ? '\u00a0' : c}</span>)}
      </div>
    </div>
  );
}
