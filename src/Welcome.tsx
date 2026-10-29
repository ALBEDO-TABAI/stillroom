import React, { useEffect, useMemo, useState } from 'react';
import { btn } from './lib/button';
import { useStore } from './store/store';
import { saveUser } from './store/persist';
import { pillRowPath } from './lib/silhouette';
import { TextCard } from './cards/TextCard';
import { Icon } from './lib/icons';
import type { Note } from './store/types';

/**
 * Signed-out landing (layout measured on the original's signed-out page, our own words and pictures):
 * a quiet field of modules at 0.85 scale, the hero block 142px above the bottom, an e-mail + "Request access"
 * pill pair 72px above the bottom, a muted footer 14px above it, and "Sign in" top-right.
 * Local-only: requests are kept on this device; nothing is sent anywhere.
 */
const S = 0.850196;
type Tile = { x: number; y: number; w: number; h: number; src?: string; voice?: boolean; d: number };
const TILES: Tile[] = [
  { x: -19.7, y: 185.9, w: 474.4, h: 266.1, src: '/fixtures/wall-glow.jpg', d: 0.1 },
  { x: 735.3, y: 49.9, w: 142.8, h: 142.8, src: '/fixtures/pebble-sand.jpg', d: 0.2 },
  { x: 408, y: 358.5, w: 173.4, h: 260.2, src: '/fixtures/hand-capsule.jpg', d: 0.25 },
  { x: 896, y: 338.1, w: 340.9, h: 191.3, src: '/fixtures/neck-glow.jpg', d: 0.3 },
  { x: 1182.5, y: 103.5, w: 221.1, h: 331.6, src: '/fixtures/chest-light.jpg', d: 0.35 },
  { x: 609.5, y: 236.1, w: 221.1, h: 165.8, voice: true, d: 0.15 },
];
const VOICE: Note = { id: 'landing-voice', type: 'audio', title: 'Idea', text: '<p>What if the room itself could listen? Speak a thought, and it settles on the canvas as a module with a title. Later you move it next to a picture, a link, a note, until the shape of the idea shows.</p>', createdAt: 0, updatedAt: 0, canvasX: 0, canvasY: 0, parentId: null, deletedAt: null, duration: '0:24', metadata: {} };

export function Welcome() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => { const f = () => setHash(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return hash.startsWith('#/welcome/login') ? <Login /> : <Landing />;
}

// Scroll story (structure measured on the original: hero → four captioned steps with dots → a short letter).
// Captions and letter are our own words.
const STEPS = ['Speak it, type it, or drop it in.', 'Move things around until they make sense.', 'Export a module, or the whole space.', 'Everything stays on this device.'];
// Where each tile sits on each step, as an offset from its hero position (px) + opacity.
const MOVES: [number, number, number][][] = [
  TILES.map(() => [0, 0, 1]),
  [[-60, 40, .35], [0, 30, .35], [40, -10, .35], [-40, 0, .35], [-30, 20, .35], [0, -40, 1]],
  [[200, 60, 1], [-100, 160, 1], [150, -40, 1], [-160, -70, 1], [-260, 40, 1], [0, -40, 1]],
  [[200, 60, .3], [-100, 160, .3], [150, -40, .3], [-160, -70, 1], [-260, 40, .3], [0, -40, .3]],
  [[120, 20, .18], [-40, 60, .18], [80, -20, .18], [-80, -30, .18], [-120, 20, .18], [0, -20, .18]],
];
const LAST = STEPS.length + 1; // letter page

function Landing() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const lock = React.useRef(0);
  const formPath = useMemo(() => pillRowPath([254, 140.2], 6), []);
  useEffect(() => { if (!sent) return; const t = setTimeout(() => setSent(null), 3200); return () => clearTimeout(t); }, [sent]);
  const go = React.useCallback((d: number) => {
    const now = Date.now(); if (now - lock.current < 650) return; lock.current = now;
    setStep(s => Math.max(0, Math.min(LAST, s + d)));
  }, []);
  useEffect(() => {
    let acc = 0;
    const wheel = (e: WheelEvent) => { if ((e.target as HTMLElement).closest('input,textarea')) return; acc += e.deltaY; if (Math.abs(acc) > 40) { go(Math.sign(acc)); acc = 0; } };
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea')) return;
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === 'Home') setStep(0); else if (e.key === 'End') setStep(LAST);
    };
    let ty = 0;
    const ts = (e: TouchEvent) => { ty = e.touches[0].clientY; };
    const te = (e: TouchEvent) => { const d = ty - e.changedTouches[0].clientY; if (Math.abs(d) > 40) go(Math.sign(d)); };
    addEventListener('wheel', wheel, { passive: true }); addEventListener('keydown', key); addEventListener('touchstart', ts, { passive: true }); addEventListener('touchend', te);
    return () => { removeEventListener('wheel', wheel); removeEventListener('keydown', key); removeEventListener('touchstart', ts); removeEventListener('touchend', te); };
  }, [go]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setSent('Enter an e-mail address.'); return; }
    const list = JSON.parse(localStorage.getItem('sr-access-requests') || '[]');
    if (!list.includes(v)) localStorage.setItem('sr-access-requests', JSON.stringify([...list, v]));
    setEmail(''); setSent('Thanks — saved on this device.');
  };
  const letter = step === LAST;
  const mv = MOVES[Math.min(step, MOVES.length - 1)];
  return (
    <div className="sr-landing" data-landing="true" data-step={step}>
      <div className="sr-landing-field" aria-hidden="true" style={{ opacity: letter ? 0 : 1 }}>
        {TILES.map((t, i) => {
          const [dx, dy, o] = mv[i];
          const inner = t.voice
            ? <div data-card="true" data-note-id={String(1000000000000 + i)} style={{ width: 260, zoom: S }}><TextCard note={VOICE} editing={false} /></div>
            : <img src={t.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
          return (
            <div key={i} className="sr-landing-tile sr-in" style={{ left: t.x, top: t.y, animationDelay: `${t.d}s` }}>
              <div className="sr-landing-move" style={{ transform: `translate(${dx}px, ${dy}px)`, opacity: o }}>
                <div className="sr-landing-drift" style={{ animationDuration: `${11 + i * 1.7}s`, animationDelay: `${-i * 2.3}s` }}>
                  {t.voice ? inner : <div data-card="true" data-note-id={String(1000000000000 + i)} style={{ width: t.w, height: t.h, borderRadius: 24 * S, overflow: 'hidden' }}>{inner}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="sr-landing-hero" style={{ opacity: letter ? 0 : 1 }}>
        <div key={step} className="sr-in sr-in--chrome" aria-live="polite" style={{ fontSize: 44, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: '52px', textWrap: 'balance', ['--sr-in-t' as any]: '0 16px', animationDuration: '.8s', animationDelay: step ? '0s' : '.35s' } as any}>{step === 0 || letter ? 'Welcome to Stillroom.' : STEPS[step - 1]}</div>
        <div style={{ opacity: step === 0 ? 1 : 0, transition: 'opacity .25s' }}><div className="sr-in sr-in--chrome" style={{ margin: '10px auto 0', maxWidth: 900, fontSize: 20, lineHeight: '28px', letterSpacing: '-0.01em', color: 'var(--sr-muted)', ['--sr-in-t' as any]: '0 12px', animationDuration: '.8s', animationDelay: '.51s' } as any}>A quiet space for visual thinking.</div></div>
        <div className="sr-dots" style={{ marginTop: 24, height: 6 }}>
          {STEPS.map((c, i) => <button key={i} type="button" className="sr-dot" aria-label={c} aria-current={step === i + 1 || undefined} tabIndex={step === 0 ? -1 : 0}
            style={{ opacity: step === 0 ? 0 : 1, width: step === i + 1 ? 18 : 6, background: step === i + 1 ? 'rgb(240,240,240)' : 'rgb(124,124,126)', pointerEvents: step === 0 ? 'none' : 'auto' }} onClick={() => setStep(i + 1)} />)}
        </div>
      </div>
      <div className="sr-landing-letter" style={{ opacity: letter ? 1 : 0, visibility: letter ? 'visible' : 'hidden' }}>
        <div className="sr-landing-letter-text">
          <p>Stillroom is a quiet room for loose thoughts: voice notes, pictures, links and a few words, side by side.</p>
          <p>It runs on your device. No account, no tracking, no feed. Your space can be exported as one file whenever you want it.</p>
          <p>It is a small, careful tool. Try it, and keep what helps.</p>
        </div>
        <a href="#/welcome/login" className="sr-btn sr-landing-try">Try it</a>
      </div>
      {step > 0 && <button type="button" className="sr-landing-signin sr-landing-back" aria-label="Back to the start" onClick={() => setStep(0)}>Stillroom</button>}
      <button type="button" aria-label="Next" className={btn({ quiet: true }) + ' sr-landing-more'} style={{ opacity: step ? 0 : 1, pointerEvents: step ? 'none' : 'auto', transition: 'opacity .25s' }} tabIndex={step ? -1 : 0} onClick={() => go(1)}><Icon name="chevronDown" /></button>
      <a href="#/welcome/login" className="sr-landing-signin">Sign in</a>
      <div className="sr-in sr-in--chrome sr-landing-form" style={{ ['--sr-in-t' as any]: '0 12px', animationDuration: '.8s', animationDelay: '.86s' } as any}>
        <form onSubmit={submit} style={{ position: 'relative', width: 400, height: 42, pointerEvents: 'auto' }} noValidate>
          <svg width="0" height="0" style={{ position: 'absolute' }}><defs><clipPath id="sr-access-clip" clipPathUnits="userSpaceOnUse"><path d={formPath} /></clipPath></defs></svg>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'var(--sr-glass)', backdropFilter: 'var(--sr-blur)', WebkitBackdropFilter: 'var(--sr-blur)', clipPath: 'url(#sr-access-clip)' }} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" aria-label="Email" type="email" className="sr-landing-email" />
          <button type="submit" className={btn({ surface: 'accent' })} style={{ position: 'absolute', left: 260, top: 0 }}>Request access</button>
        </form>
      </div>
      {sent && <div className="sr-toast sr-in" role="status" style={{ bottom: 128 }}>{sent}</div>}
      <div className="sr-in sr-in--chrome sr-landing-foot" style={{ ['--sr-in-t' as any]: '0 8px', animationDuration: '.8s', animationDelay: '1.02s' } as any}>
        <span>© 2026 Stillroom</span><span>·</span><span>Open beta for desktop browsers</span><span>·</span>
        <a href="#/welcome" onClick={e => { e.preventDefault(); setSent('Everything stays on this device.'); }}>Privacy</a><span>·</span>
        <a href="#/welcome" onClick={e => { e.preventDefault(); setSent('Local-only test build. No account, no tracking.'); }}>Terms</a>
      </div>
    </div>
  );
}

/** "Sign in": local-only, it just names the canvas on this device. */
function Login() {
  const user = useStore(s => s.username);
  return (
    <div className="sr-landing" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <a href="#/welcome" className="sr-landing-signin" style={{ left: 20, right: 'auto' }}>Stillroom</a>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 20 }}>Sign in</div>
        <form style={{ display: 'flex', gap: 6, justifyContent: 'center' }} onSubmit={e => {
          e.preventDefault(); const v = ((new FormData(e.currentTarget).get('u') as string) || 'me').replace(/[^\w.-]/g, '').slice(0, 24) || 'me';
          saveUser(v); useStore.setState({ username: v }); location.hash = '';
        }}>
          <input name="u" defaultValue={user} aria-label="Name" className="sr-landing-email" style={{ position: 'static', width: 220, background: 'var(--sr-glass)', borderRadius: 999 }} />
          <button className={btn({ surface: 'accent' })} type="submit">Open canvas</button>
        </form>
      </div>
    </div>
  );
}
