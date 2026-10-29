import React from 'react';
import { btn } from './lib/button';
import { useStore } from './store/store';
import { saveUser } from './store/persist';

/** Signed-out front door. Local-only app: "signing in" just names the canvas on this device. */
export function Welcome() {
  const user = useStore(s => s.username);
  return (
    <div className="sr-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 560, padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 44, lineHeight: '52px', fontWeight: 500, letterSpacing: '-0.03em', margin: '0 0 16px' }}>A calm room for thinking in pictures.</h1>
        <p style={{ fontSize: 20, lineHeight: '28px', color: 'var(--sr-muted)', margin: '0 0 32px' }}>Say it, type it, or drop it in. Voice, text, images and links side by side on one canvas.</p>
        <form style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onSubmit={e => {
          e.preventDefault(); const v = (new FormData(e.currentTarget).get('u') as string || 'me').replace(/[^\w.-]/g, '').slice(0, 24) || 'me';
          saveUser(v); useStore.setState({ username: v }); location.hash = '';
        }}>
          <input name="u" defaultValue={user} aria-label="Name" style={{ height: 42, borderRadius: 999, border: 'none', padding: '0 18px', font: '400 15px Inter, sans-serif', background: 'var(--sr-solid)', color: 'var(--sr-text)', width: 200, outline: 'none' }} />
          <button className={btn({ surface: 'accent' })} type="submit">Open canvas</button>
        </form>
      </div>
    </div>
  );
}
