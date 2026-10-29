import type { Note } from '../store/types';
import { resolveMedia } from '../store/blobs';

const safe = (s: string) => (s || 'module').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'module';
function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function htmlToMd(html: string): string {
  const d = document.createElement('div'); d.innerHTML = html;
  const walk = (n: Node, depth = 0): string => {
    if (n.nodeType === 3) return n.textContent ?? '';
    const el = n as HTMLElement; const kids = () => [...el.childNodes].map(c => walk(c, depth)).join('');
    switch (el.tagName) {
      case 'H1': return `# ${kids()}\n\n`; case 'H2': return `## ${kids()}\n\n`; case 'H3': return `### ${kids()}\n\n`;
      case 'P': return `${kids()}\n\n`;
      case 'STRONG': case 'B': return `**${kids()}**`; case 'EM': case 'I': return `*${kids()}*`;
      case 'CODE': return '`' + kids() + '`'; case 'PRE': return '```\n' + el.textContent + '\n```\n\n';
      case 'A': return `[${kids()}](${el.getAttribute('href')})`;
      case 'BLOCKQUOTE': return kids().trim().split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
      case 'UL': case 'OL': return [...el.children].map((li, i) => {
        const check = li.getAttribute('data-checked');
        const mark = check != null ? `- [${check === 'true' ? 'x' : ' '}] ` : el.tagName === 'OL' ? `${i + 1}. ` : '- ';
        return '  '.repeat(depth) + mark + [...li.childNodes].map(c => walk(c, depth + 1)).join('').trim();
      }).join('\n') + '\n\n';
      case 'HR': return '---\n\n'; case 'BR': return '\n';
      case 'IMG': return `![](${el.getAttribute('src')})`;
      default: return kids();
    }
  };
  return walk(d).replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
export function noteToMd(n: Note) {
  const head = n.title && n.type !== 'link' ? `# ${n.title}\n\n` : '';
  if (n.type === 'link') return `[${n.metadata.domain ?? n.title}](${n.metadata.url ?? n.title})\n`;
  if (n.type === 'image' || n.type === 'video') return `${head}![${n.metadata.originalFilename ?? ''}](${n.metadata.originalFilename ?? n.mediaUrl})\n`;
  return head + htmlToMd(n.text || '');
}
export function exportMd(n: Note) { save(new Blob([noteToMd(n)], { type: 'text/markdown' }), `${safe(n.title)}.md`); }

export async function exportPng(n: Note) {
  if (n.type === 'image') {
    const u = await resolveMedia(n.mediaUrl); if (!u) return;
    const b = await (await fetch(u)).blob();
    const c = await drawImage(b); c.toBlob(x => x && save(x, `${safe(n.title)}.png`), 'image/png'); return;
  }
  const W = 1040, pad = 68, dark = document.documentElement.dataset.theme === 'dark';
  const c = document.createElement('canvas'); const ctx = c.getContext('2d')!;
  const lines = (txt: string, font: string, max: number) => {
    ctx.font = font; const out: string[] = [];
    for (const para of txt.split('\n')) { let line = ''; for (const w of para.split(' ')) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; } out.push(line); }
    return out;
  };
  const tf = '500 72px Inter, sans-serif', bf = '400 44px Inter, sans-serif';
  const body = (n.text || '').replace(/<\/(p|li|h\d)>/g, '\n').replace(/<[^>]+>/g, '').trim();
  const tl = lines(n.title || (n.type === 'link' ? n.metadata.domain ?? '' : ''), tf, W - 2 * pad);
  const bl = body ? lines(body, bf, W - 2 * pad) : [];
  c.width = W; c.height = pad * 2 + tl.length * 86 + (bl.length ? 40 + bl.length * 64 : 0);
  ctx.fillStyle = dark ? '#141414' : '#FFFFFF'; ctx.beginPath(); ctx.roundRect(0, 0, c.width, c.height, 96); ctx.fill();
  ctx.fillStyle = dark ? '#F5F5F5' : '#212121'; ctx.textBaseline = 'top';
  let y = pad; ctx.font = tf; for (const l of tl) { ctx.fillText(l, pad, y); y += 86; }
  y += 40; ctx.font = bf; for (const l of bl) { ctx.fillText(l, pad, y); y += 64; }
  c.toBlob(x => x && save(x, `${safe(n.title)}.png`), 'image/png');
}
async function drawImage(b: Blob) {
  const bmp = await createImageBitmap(b); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d')!.drawImage(bmp, 0, 0); return c;
}
export async function exportPdf(n: Note) {
  const w = window.open('', '_blank'); if (!w) return;
  const media = n.type === 'image' ? `<img src="${await resolveMedia(n.mediaUrl)}" style="max-width:100%;border-radius:24px">` : '';
  w.document.write(`<!doctype html><title>${n.title || 'Module'}</title><style>body{font:18px/1.5 Inter,system-ui,sans-serif;max-width:720px;margin:60px auto;color:#212121}h1{font-size:36px;font-weight:500;letter-spacing:-.02em;line-height:1.12;margin:0 0 30px}</style>${n.title ? `<h1>${n.title}</h1>` : ''}${media}${n.text || ''}<script>setTimeout(()=>print(),300)<\/script>`);
  w.document.close();
}
