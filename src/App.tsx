import React, { useEffect, useState } from 'react';
import { useStore } from './store/store';
import { Canvas } from './canvas/Canvas';
import { BinView } from './chrome/BinView';
import { TopBar } from './chrome/TopBar';
import { RecordButton } from './chrome/Record';
import { Bin } from './chrome/Bin';
import { CanvasMenu, AxisMenu, LinkInput } from './overlays/Menus';
import { EditorWindow } from './overlays/EditorWindow';
import { Slideshow } from './overlays/Slideshow';
import { useShortcuts } from './canvas/useShortcuts';
import { addFiles, addTextOrLink } from './lib/capture';
import { toWorld } from './canvas/camera';
import { Welcome } from './Welcome';

export function App({ demo }: { demo: boolean }) {
  const dark = useStore(s => s.prefs.dark);
  const route = useRoute();
  useEffect(() => {
    const dark_ = dark;
    { const dark = dark_ || route === 'welcome'; // the signed-out landing is always dark (as measured)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.backgroundColor = dark ? '#000000' : '#E5E5EA';
    document.body.style.backgroundColor = dark ? '#000000' : '#E5E5EA';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#E5E5EA'); }
  }, [dark, route]);
  if (route === 'welcome') return <Welcome />;
  return <Workspace demo={demo} />;
}

function useNarrow() {
  const [n, setN] = useState(() => innerWidth < 600);
  useEffect(() => { const f = () => setN(innerWidth < 600); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  return n;
}

function Workspace({ demo }: { demo: boolean }) {
  useShortcuts();
  const narrow = useNarrow();
  const binMode = useStore(s => s.ui.binOpen);
  const toast = useStore(s => s.ui.toast);
  const setUI = useStore(s => s.setUI);
  const [drag, setDrag] = useState(false);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setUI({ toast: null }), 2600); return () => clearTimeout(t); }, [toast, setUI]);
  return (
    <div className="sr-app"
      onDragOver={e => { if ([...e.dataTransfer.types].some(t => t === 'Files' || t === 'text/uri-list' || t === 'text/plain')) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={e => { if (!e.relatedTarget) setDrag(false); }}
      onDrop={e => {
        e.preventDefault(); setDrag(false);
        const at = toWorld(e.clientX, e.clientY);
        const files = [...e.dataTransfer.files];
        if (files.length) { addFiles(files, at); return; }
        const t = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
        if (t) addTextOrLink(t.split('\n')[0].startsWith('http') ? t.split('\n')[0] : t, at);
      }}>
      {/* Under 600px the canvas steps aside: the phone is a voice-capture remote (as measured on the reference). */}
      {!narrow && !binMode && <Canvas />}
      {!narrow && binMode && <BinView />}
      {!narrow && <TopBar demo={demo} />}
      {!narrow && <Bin hidden={demo} />}
      {narrow && demo && <a className="sr-btn" href="#/welcome" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 170, textDecoration: 'none' }}>Stillroom</a>}
      {!binMode && <RecordButton mobile={narrow} />}
      <CanvasMenu />
      <AxisMenu />
      <LinkInput />
      <EditorWindow />
      <Slideshow />
      {toast && <div className="sr-toast sr-in" style={{ ['--sr-in-t' as any]: '0 8px' }}>{toast}</div>}
      {drag && <div className="sr-drop" />}
    </div>
  );
}

function useRoute() {
  const get = () => (location.hash.startsWith('#/welcome') || location.pathname === '/welcome' ? 'welcome' : 'canvas');
  const [r, setR] = useState(get);
  useEffect(() => { const f = () => setR(get()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
}
