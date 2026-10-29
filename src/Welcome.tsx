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

function Landing() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const formPath = useMemo(() => pillRowPath([254, 140.2], 6), []);
  useEffect(() => { if (!sent) return; const t = setTimeout(() => setSent(null), 3200); return () => clearTimeout(t); }, [sent]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setSent('Enter an e-mail address.'); return; }
    const list = JSON.parse(localStorage.getItem('sr-access-requests') || '[]');
    if (!list.includes(v)) localStorage.setItem('sr-access-requests', JSON.stringify([...list, v]));
    setEmail(''); setSent('Thanks — saved on this device.');
  };
  return (
    <div className="sr-landing" data-landing="true">
      <div className="sr-landing-field" aria-hidden="true">
        {TILES.map((t, i) => t.voice ? (
          <div key={i} className="sr-landing-tile sr-in" style={{ left: t.x, top: t.y, animationDelay: `${t.d}s` }}>
            <div data-card="true" data-note-id={String(1000000000000 + i)} style={{ width: 260, zoom: S }}><TextCard note={VOICE} editing={false} /></div>
          </div>
        ) : (
          <div key={i} data-card="true" data-note-id={String(1000000000000 + i)} className="sr-landing-tile sr-in" style={{ left: t.x, top: t.y, width: t.w, height: t.h, borderRadius: 24 * S, overflow: 'hidden', animationDelay: `${t.d}s` }}>
            <img src={t.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>
      <div className="sr-landing-hero">
        <div className="sr-in sr-in--chrome" style={{ fontSize: 44, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: '52px', textWrap: 'balance', ['--sr-in-t' as any]: '0 16px', animationDuration: '.8s', animationDelay: '.35s' } as any}>Welcome to Stillroom.</div>
        <div className="sr-in sr-in--chrome" style={{ margin: '10px auto 0', maxWidth: 900, fontSize: 20, lineHeight: '28px', letterSpacing: '-0.01em', color: 'var(--sr-muted)', ['--sr-in-t' as any]: '0 12px', animationDuration: '.8s', animationDelay: '.51s' } as any}>A quiet space for visual thinking.</div>
        <div aria-hidden="true" style={{ marginTop: 24, height: 6 }} />
      </div>
      <button type="button" aria-label="More" className={btn({ quiet: true }) + ' sr-landing-more'} onClick={() => { location.hash = '#/welcome/login'; }}><Icon name="chevronDown" /></button>
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
