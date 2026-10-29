// Capture: files (pictures, video, voice), links and text arriving by drop or paste become modules.
import { useStore, blankNote } from '../store/store';
import { putBlob } from '../store/blobs';
import { fmtDur } from './time';
import { CARD_W } from './constants';

const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i;

function imageMeta(file: Blob): Promise<{ w: number; h: number }> {
  return new Promise(res => { const u = URL.createObjectURL(file); const i = new Image(); i.onload = () => { res({ w: i.naturalWidth, h: i.naturalHeight }); URL.revokeObjectURL(u); }; i.onerror = () => res({ w: 4, h: 3 }); i.src = u; });
}
function mediaMeta(file: Blob, kind: 'video' | 'audio'): Promise<{ w: number; h: number; d: number; poster?: Blob }> {
  return new Promise(res => {
    const u = URL.createObjectURL(file); const el = document.createElement(kind);
    el.preload = 'metadata'; (el as HTMLVideoElement).muted = true;
    el.onloadedmetadata = () => {
      const v = el as HTMLVideoElement; const d = el.duration || 0;
      if (kind === 'audio') { res({ w: 0, h: 0, d }); return; }
      v.currentTime = Math.min(0.1, d / 2);
      v.onseeked = () => {
        const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext('2d')!.drawImage(v, 0, 0);
        c.toBlob(b => res({ w: v.videoWidth, h: v.videoHeight, d, poster: b ?? undefined }), 'image/jpeg', .8);
      };
    };
    el.onerror = () => res({ w: 16, h: 9, d: 0 });
    el.src = u;
  });
}

export async function addFiles(files: File[], at: { x: number; y: number }) {
  const st = useStore.getState();
  let x = at.x, y = at.y; const made: string[] = [];
  for (const f of files) {
    if (f.type.startsWith('image/')) {
      const { w, h } = await imageMeta(f);
      const dw = Math.round(Math.min(463, Math.max(173, w / 3)));
      const n = blankNote('image', x, y, { title: f.name.replace(/\.[^.]+$/, ''), metadata: { aspectRatio: +(h / w).toFixed(4), displayWidth: dw, originalFilename: f.name, fileSize: f.size, lightImage: false } });
      n.mediaUrl = await putBlob(`${n.id}-img`, f);
      st.add(n); made.push(n.id); x += dw + st.prefs.gap;
    } else if (f.type.startsWith('video/')) {
      const m = await mediaMeta(f, 'video');
      const n = blankNote('video', x, y, { title: f.name.replace(/\.[^.]+$/, ''), duration: fmtDur(m.d), metadata: { aspectRatio: +(m.h / (m.w || 16)).toFixed(4), displayWidth: 320, originalFilename: f.name, fileSize: f.size } });
      n.mediaUrl = await putBlob(`${n.id}-vid`, f);
      if (m.poster) n.metadata.poster = await putBlob(`${n.id}-poster`, m.poster);
      st.add(n); made.push(n.id); x += 320 + st.prefs.gap;
    } else if (f.type.startsWith('audio/')) {
      const m = await mediaMeta(f, 'audio');
      const n = blankNote('audio', x, y, { title: f.name.replace(/\.[^.]+$/, ''), duration: fmtDur(m.d), metadata: { originalFilename: f.name, fileSize: f.size } });
      n.audioUrl = await putBlob(`${n.id}-aud`, f);
      if (st.prefs.autoTranscribe) {
        // Local-only: no speech service, so the "transcription" resolves to the filename after a short beat,
        // then the card crystallizes and cools from orange to its base colour (1.6s + 4.5s).
        n.metadata.transcribing = true;
        const id = n.id, upd = (m: object) => { const cur = useStore.getState().notes[id]; if (cur) useStore.getState().update(id, { metadata: { ...cur.metadata, ...m } }); };
        setTimeout(() => { upd({ transcribing: false, cooling: true }); setTimeout(() => upd({ cooling: false }), 6200); }, 3600);
      }
      st.add(n); made.push(n.id); x += CARD_W + st.prefs.gap;
    } else if (/\.(md|txt|markdown)$/i.test(f.name) || f.type.startsWith('text/')) {
      const txt = await f.text();
      const [first, ...rest] = txt.split('\n');
      const n = blankNote('text', x, y, { title: first.replace(/^#+\s*/, '').slice(0, 120), text: rest.join('\n').trim().split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join(''), metadata: { packed: true } });
      st.add(n); made.push(n.id); x += CARD_W + st.prefs.gap;
    }
  }
  if (made.length) useStore.getState().select(made);
}
const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

export function addTextOrLink(text: string, at: { x: number; y: number }) {
  const t = text.trim(); if (!t) return;
  const st = useStore.getState();
  if (URL_RE.test(t) && !/\s/.test(t)) {
    const url = /^https?:\/\//.test(t) ? t : `https://${t}`;
    let domain = url; try { domain = new URL(url).hostname; } catch { /* */ }
    st.add(blankNote('link', at.x - 130, at.y - 97, { title: url, metadata: { url, domain } }), { select: true });
    return;
  }
  const [first, ...rest] = t.split('\n');
  const body = rest.join('\n').trim();
  st.add(blankNote('text', at.x - 130, at.y - 33, body
    ? { title: first.slice(0, 140), text: body.split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join(''), metadata: { packed: true } }
    : { title: t.slice(0, 400), metadata: { titleAlign: 'center' } }), { select: true });
}
