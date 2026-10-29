// Capture: files (pictures, video, voice), links and text arriving by drop or paste become modules.
import { useStore, blankNote } from '../store/store';
import { putBlob } from '../store/blobs';
import { fmtDur } from './time';
import { CARD_W } from './constants';

export function webLink(text: string) {
  const explicit = /^https?:\/\//i.test(text);
  if (/\s/.test(text) || /^[a-z][a-z\d+.-]*:/i.test(text) && !explicit) return null;
  try {
    const url = new URL(explicit ? text : `https://${text}`);
    if (!explicit && !/\.(?:[a-z]{2,}|xn--[a-z0-9-]+)\.?$/i.test(url.hostname)) return null;
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

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
  // many files land as a tidy grid (rows of up to 5), not one endless row
  const perRow = 5; let col = 0, rowH = 0;
  let x = at.x, y = at.y; const made: string[] = [];
  const wrap = (h: number) => { rowH = Math.max(rowH, h); if (++col >= perRow) { col = 0; x = at.x; y += rowH + st.prefs.gap; rowH = 0; } };
  for (const f of files) {
    if (f.type.startsWith('image/')) {
      const { w, h } = await imageMeta(f);
      const dw = Math.round(Math.min(463, Math.max(173, w / 3)));
      const n = blankNote('image', x, y, { title: f.name.replace(/\.[^.]+$/, ''), metadata: { aspectRatio: +(h / w).toFixed(4), displayWidth: dw, originalFilename: f.name, fileSize: f.size, lightImage: false } });
      n.mediaUrl = await putBlob(`${n.id}-img`, f);
      st.add(n); made.push(n.id); x += dw + st.prefs.gap; wrap(dw * (h / w));
    } else if (f.type.startsWith('video/')) {
      continue; // like the original: dropped video files are ignored (no module is created)
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
      st.add(n); made.push(n.id); x += CARD_W + st.prefs.gap; wrap(166);
    } else if (/\.(md|txt|markdown)$/i.test(f.name) || f.type.startsWith('text/')) {
      const txt = await f.text();
      const [first, ...rest] = txt.split('\n');
      const n = blankNote('text', x, y, { title: first.replace(/^#+\s*/, '').slice(0, 120), text: rest.join('\n').trim().split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join(''), metadata: { packed: true } });
      st.add(n); made.push(n.id); x += CARD_W + st.prefs.gap; wrap(195);
    }
  }
  if (made.length) useStore.getState().select(made);
}
const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

export function addTextOrLink(text: string, at: { x: number; y: number }) {
  const t = text.trim(); if (!t) return;
  const st = useStore.getState();
  const url = webLink(t);
  if (url) {
    let domain = url; try { domain = new URL(url).hostname; } catch { /* */ }
    const n = blankNote('link', at.x - 130, at.y - 97, { title: url, metadata: { url, domain } });
    st.add(n, { select: true });
    return;
  }
  const [first, ...rest] = t.split('\n');
  const body = rest.join('\n').trim();
  st.add(blankNote('text', at.x - 130, at.y - 33, body
    ? { title: first.slice(0, 140), text: body.split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join(''), metadata: { packed: true } }
    : { title: t.slice(0, 400), metadata: { titleAlign: 'center' } }), { select: true });
}

// Rich-text paste: keep structure (headings, lists, emphasis, links, task lists), drop everything else.
const KEEP = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'A', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'CODE', 'PRE', 'MARK']);
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (el: Element): string => [...el.childNodes].map(n => {
    if (n.nodeType === 3) return esc(n.textContent ?? '');
    if (n.nodeType !== 1) return '';
    const e = n as Element;
    if (/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|IFRAME|OBJECT|svg|SVG)$/.test(e.tagName)) return ''; const tag = e.tagName === 'B' ? 'STRONG' : e.tagName === 'I' ? 'EM' : e.tagName;
    const inner = walk(e);
    if (!KEEP.has(e.tagName)) return /^(DIV|SECTION|ARTICLE|TR|H4|H5|H6)$/.test(e.tagName) ? (inner.trim() ? `<p>${inner}</p>` : '') : inner;
    if (tag === 'A') { const href = e.getAttribute('href') ?? ''; return /^(https?:|mailto:)/i.test(href) ? `<a href="${esc(href).replace(/"/g, '&quot;')}">${inner}</a>` : inner; }
    if (tag === 'BR') return '<br>';
    return `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`;
  }).join('');
  return walk(doc.body).replace(/(<p>\s*<\/p>)+/g, '').trim();
}
/** Pasted rich text becomes a packed text module: first heading/line is the title. */
export function htmlToNote(html: string, at: { x: number; y: number }) {
  const clean = sanitizeHtml(html); if (!clean) return null;
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  const first = doc.body.firstElementChild;
  let title = '';
  if (first && /^(H1|H2|H3|P)$/.test(first.tagName) && (first.textContent ?? '').length <= 140) { title = first.textContent ?? ''; first.remove(); }
  const body = doc.body.innerHTML.trim();
  if (!body && !title) return null;
  if (!body) return blankNote('text', at.x - 130, at.y - 33, { title: title.slice(0, 400), metadata: { titleAlign: 'center' } });
  return blankNote('text', at.x - 130, at.y - 97, { title, text: body, metadata: { packed: true } });
}
