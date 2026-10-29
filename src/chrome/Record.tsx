import React, { useRef, useState } from 'react';
import { Icon } from '../lib/icons';
import { useStore, blankNote } from '../store/store';
import { putBlob } from '../store/blobs';
import { toWorld } from '../canvas/camera';
import { fmtDur } from '../lib/time';
import { useEscape } from '../lib/motion';

/** Press the microphone to record; press again to save the voice module. */
export function RecordButton({ mobile = false }: { mobile?: boolean }) {
  const [phase, setPhase] = useState<null | 'saved'>(null);
  const focus = useStore(s => s.ui.focus);
  const setUI = useStore(s => s.setUI);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const transcript = useRef('');
  const recog = useRef<any>(null);

  useEscape(() => stop(true), !!rec);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = []; transcript.current = '';
      mr.ondataavailable = e => e.data.size && chunks.current.push(e.data);
      mr.start(250); started.current = Date.now(); setRec(mr); setUI({ recording: true });
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR && useStore.getState().prefs.autoTranscribe) {
        const r = new SR(); r.continuous = true; r.interimResults = false; r.lang = navigator.language || 'en-US';
        r.onresult = (e: any) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) transcript.current += e.results[i][0].transcript + ' '; };
        try { r.start(); recog.current = r; } catch { /* */ }
      }
    } catch {
      setUI({ toast: 'Microphone is not available' });
    }
  }
  function stop(cancel = false) {
    const mr = rec; if (!mr) return;
    try { recog.current?.stop(); } catch { /* */ }
    mr.onstop = async () => {
      mr.stream.getTracks().forEach(tr => tr.stop());
      setRec(null); setUI({ recording: false });
      if (cancel || !chunks.current.length) return;
      const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
      const secs = (Date.now() - started.current) / 1000;
      const c = toWorld(innerWidth / 2, innerHeight / 2);
      const n = blankNote('audio', c.x - 130, c.y - 70);
      n.audioUrl = await putBlob(`${n.id}-audio`, blob);
      n.duration = fmtDur(secs);
      const text = transcript.current.trim();
      n.title = text ? text.split(/[.!?]/)[0].slice(0, 60) : 'Voice memo';
      n.text = text ? `<p>${text}</p>` : '';
      n.metadata = { transcript: text };
      useStore.getState().add(n, { select: true });
      if (mobile) { setPhase('saved'); setTimeout(() => setPhase(null), 1500); }
    };
    mr.stop();
  }

  return (
    <>
      <div className="sr-record-wrap" style={mobile ? { inset: 0, padding: 0 } : { opacity: focus ? 0 : 1, transform: focus ? 'translateY(80px)' : 'none' }}>
        <div style={{ position: 'relative', pointerEvents: 'all' }}>
          {mobile && phase === 'saved' && <div className="sr-saved">Saved</div>}
          <button className="sr-record" data-rec={rec ? 'true' : undefined} data-mobile={mobile ? 'true' : undefined} aria-pressed={!!rec} aria-label={rec ? 'Stop recording' : 'Record a voice module'} title={rec ? 'Stop' : 'Record'}
            disabled={!!phase}
            style={phase ? { opacity: 0, transform: 'scale(0)', pointerEvents: 'none' } : undefined}
            onClick={() => (rec ? stop() : start())}>
            <Icon name="mic" size={mobile ? 32 : 22} />
          </button>
        </div>
      </div>
    </>
  );
}
