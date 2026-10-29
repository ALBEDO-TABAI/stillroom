import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore, liveIds } from '../store/store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../lib/icons';
import { btn } from '../lib/button';
import { pillRowPath } from '../lib/silhouette';
import { UserMenu } from './UserMenu';
import { frameRect } from '../canvas/camera';
import { rectOf } from '../lib/geometry';
import { useEscape } from '../lib/motion';

export function TopBar({ demo }: { demo: boolean }) {
  const dark = useStore(s => s.prefs.dark);
  const username = useStore(s => s.username);
  const open = useStore(s => s.ui.userMenu);
  const focus = useStore(s => s.ui.focus);
  const setUI = useStore(s => s.setUI);
  const setPrefs = useStore(s => s.setPrefs);
  const nameRef = useRef<HTMLButtonElement>(null);
  const [crumb, setCrumb] = useState(false);
  const binCount = useStore(s => s.ui.binOpen ? Object.values(s.notes).filter(n => n.deletedAt).length : 0);
  const folders = useStore(useShallow(s => s.order.map(id => s.notes[id]).filter(n => n && n.type === 'folder' && !n.parentId && !n.deletedAt).map(n => n.id + '\u0000' + (n.title || 'Folder')))).map(k => { const [id, title] = k.split('\u0000'); return { id, title }; });
  useEscape(() => setCrumb(false), crumb);
  const [nameW, setNameW] = useState(82.77);
  useLayoutEffect(() => { if (nameRef.current) setNameW(nameRef.current.getBoundingClientRect().width); }, [username]);
  const path = useMemo(() => pillRowPath([48, nameW], 6), [nameW]);
  const total = 48 + 6 + nameW;

  return (
    <div className="sr-topbar" data-topbar="true" data-hidden={focus ? 'true' : undefined}>
      <div style={{ position: 'relative', flexShrink: 0, pointerEvents: 'auto' }}>
        <div className="sr-sil" aria-hidden="true" style={{ width: total }}>
          <svg width="0" height="0" style={{ position: 'absolute' }}><defs><clipPath id="sr-sil-user" clipPathUnits="userSpaceOnUse"><path d={path} /></clipPath></defs></svg>
          <div style={{ clipPath: 'url(#sr-sil-user)' }} />
        </div>
        <div className="sr-pillgroup">
          <button aria-label="User menu" className={btn({ icon: true, surface: 'ghost', quiet: true, on: open })} onClick={() => setUI({ userMenu: !open, shortcuts: false, menu: null })}>
            <Icon name="user" />
          </button>
          <button ref={nameRef} data-bc-pill="true" className={btn({ surface: 'ghost', quiet: true })} style={crumb ? { background: 'var(--sr-tint)', color: 'var(--sr-text)' } : undefined} onClick={() => { setUI({ userMenu: false, shortcuts: false, menu: null }); setCrumb(c => !c); }}>@{username}</button>
        </div>
        {crumb && folders.length > 0 && (
          // Folder column under the handle (measured: 42 + 6 below, 6 apart, left-aligned to the handle).
          <div className="sr-crumbs sr-in" style={{ left: 54, ['--sr-in-t' as any]: '0 -10px' }}>
            {folders.map(f => (
              <button key={f.id} data-bc-col-pill="true" className={btn({ surface: 'ghost', quiet: true })} style={{ background: 'var(--sr-glass)', WebkitBackdropFilter: 'var(--sr-blur)', backdropFilter: 'var(--sr-blur)' }} onClick={() => { setCrumb(false); setUI({ openFolderId: f.id }); }}>{f.title}</button>
            ))}
          </div>
        )}
        {open && <UserMenu />}
      </div>
      {!demo && binCount > 0 && <button className={btn({ quiet: true }) + ' sr-clear-all'} style={{ right: 'calc(50% + 98px)' }}
        onClick={() => { if (confirm('Permanently delete all items in Bin? This cannot be undone.')) useStore.getState().purge(Object.values(useStore.getState().notes).filter(n => n.deletedAt).map(n => n.id)); }}>Clear All</button>}
      {!demo && <Search />}
      <div style={{ flex: 1 }} />
      <button className={btn({ icon: true, quiet: true })} style={{ pointerEvents: 'auto' }} title={dark ? 'Light mode' : 'Dark mode'}
        onClick={() => setPrefs({ dark: !dark })}>
        <Icon name={dark ? 'sun' : 'moon'} />
      </button>
    </div>
  );
}

function strip(html: string) { return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

const stamp = (ts: number) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
function Mark({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <span>{text}</span>;
  return <span>{text.slice(0, i)}<span className="sr-hit">{text.slice(i, i + q.length)}</span>{text.slice(i + q.length)}</span>;
}

export function Search() {
  const q = useStore(s => s.ui.search);
  const bin = useStore(s => s.ui.binOpen);
  const setUI = useStore(s => s.setUI);
  const notes = useStore(s => s.notes);
  const inp = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [hi, setHi] = useState(-1);
  useEscape(() => { setUI({ search: '' }); inp.current?.blur(); }, focused || !!q);
  React.useEffect(() => {
    const f = () => inp.current?.focus();
    addEventListener('sr:search', f); return () => removeEventListener('sr:search', f);
  }, []);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase(); if (!t) return [];
    return Object.values(notes).filter(n => (bin ? !!n.deletedAt : !n.deletedAt) && (n.title + ' ' + strip(n.text) + ' ' + (n.metadata.linkTitle ?? '') + ' ' + (n.metadata.domain ?? '') + ' ' + (n.metadata.transcript ?? '')).toLowerCase().includes(t)).slice(0, 30);
  }, [q, notes, bin]);
  const go = (id: string) => {
    const st = useStore.getState(); const n = st.notes[id];
    if (!bin) {
      const target = n.parentId ? st.notes[n.parentId] : n;
      frameRect(rectOf(target, st.sizes), { pad: 160, maxZ: 1.6 });
      st.select([target.id]);
    }
    setUI({ search: '' }); inp.current?.blur();
  };
  const open = !!q.trim() && results.length > 0;
  // Measured widths: rest 180, focused 260, typing 420 (results hang off the pill's bottom edge).
  const w = q.trim() ? 420 : focused ? 260 : 180;
  const kids = (id: string) => Object.values(notes).filter(c => c.parentId === id && !c.deletedAt).length;
  return (
    <div className="sr-search">
      <div style={{ position: 'relative' }}>
        <div className="sr-search-pill" style={{ width: w, borderRadius: open ? '14px 14px 0 0' : 999 }}>
          <input ref={inp} placeholder={bin ? 'Search in Bin' : 'Search'} type="text" value={q} onChange={e => { setUI({ search: e.target.value }); setHi(-1); }}
            onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, results.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, -1)); }
              else if (e.key === 'Enter' && results.length) go(results[Math.max(0, hi)].id);
            }} />
          {q && <button className="sr-search-clear" aria-label="Clear search" onMouseDown={e => e.preventDefault()} onClick={() => setUI({ search: '' })}><Icon name="close" size={12} sw={2} /></button>}
        </div>
        {open && (
          <div className="sr-search-drop sr-in" style={{ ['--sr-in-t' as any]: '0 -8px' }}>
            {results.map((n, i) => {
              const title = n.type === 'link' ? (n.metadata.linkTitle || n.metadata.domain || n.title) : (n.title || n.metadata.originalFilename || n.type);
              const body = strip(n.text);
              return (
                <div key={n.id} className="sr-search-item" data-search-idx={i} data-on={i === hi ? 'true' : undefined} onMouseDown={e => e.preventDefault()} onClick={() => go(n.id)} onMouseEnter={() => setHi(i)}>
                  <div className="t"><Icon name={n.type === 'folder' ? 'folder' : n.type === 'image' ? 'camera' : n.type === 'link' ? 'link' : n.type === 'audio' ? 'mic' : n.type === 'video' ? 'video' : 'text'} size={12} sw={2} /><Mark text={title} q={q.trim()} /></div>
                  {n.type !== 'folder' && body && <div className="b">{body}</div>}
                  <div className="m">{n.type === 'folder' && <span>{kids(n.id)} modules</span>}<span>{stamp(n.createdAt)}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
