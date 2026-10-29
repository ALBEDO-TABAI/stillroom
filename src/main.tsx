import './lib/archive';
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/button.css';
import './styles/canvas.css';
import './styles/chrome.css';
import { App } from './App';
import { useStore } from './store/store';
import { loadNotes, loadCam, loadPrefs, loadUser, loadFolder, startPersistence, storageIssue } from './store/persist';
import { demoNotes, starterNotes, accountStarterNotes, stressNotes } from './fixtures/demo';
import { fitCamera } from './lib/fit';

// URL switches (used by the parity harness): ?fixture=demo  ?theme=dark|light  ?chrome=demo  ?user=name
const q = new URLSearchParams(location.search);
const fixture = q.get('fixture');
const demo = q.get('chrome') ? q.get('chrome') === 'demo' : fixture === 'demo';
const prefs = loadPrefs();
if (q.get('theme')) prefs.dark = q.get('theme') !== 'light';
const userFromPath = location.pathname.match(/^\/(?:user\/|@)([\w.-]+)/)?.[1];
let notes = fixture ? null : loadNotes();
const fresh = !notes;
if (!notes) notes = fixture === 'stress' ? stressNotes(+(q.get('n') || 500)) : fixture === 'demo' ? demoNotes() : fixture === 'media' ? starterNotes() : accountStarterNotes();
const W = innerWidth, H = innerHeight;
const camQ = q.get('cam')?.split(',').map(Number);
const cam = (camQ && camQ.length === 3 ? { x: camQ[0], y: camQ[1], z: camQ[2] } : null) || (!fresh && loadCam()) || fitCamera(notes, W, H, { pad: -50, zoomIn: 1.3, centerHero: true });
if (fixture) prefs.storeLocally = false;
if (q.get('gap')) prefs.gap = +q.get('gap')!;
useStore.setState({ prefs, username: q.get('user') ?? userFromPath ?? (fixture ? 'demo' : loadUser()) });
useStore.getState().replaceAll(notes, cam);
// reopen the folder you were in (if it still exists)
const lastFolder = fixture ? null : loadFolder();
if (lastFolder && notes.some(n => n.id === lastFolder && n.type === 'folder' && !n.deletedAt)) useStore.getState().setUI({ openFolderId: lastFolder });
if (storageIssue) useStore.getState().setUI({ toast: storageIssue });
startPersistence();
(window as any).__sr = useStore; // harness/debug handle

createRoot(document.getElementById('root')!).render(<App demo={demo} />);
