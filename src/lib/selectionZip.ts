import JSZip from 'jszip';
import type { Note } from '../store/types';
import { useStore } from '../store/store';
import { resolveMedia } from '../store/blobs';
import { noteToMd } from './exporters';

const safeName = (s: string) => s.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/^\.+|[. ]+$/g, '').trim().slice(0, 100) || 'Untitled';

/** A readable download, rather than a whole-space backup: folders, original media and Markdown. */
export async function selectionZip(ids: string[], notes: Record<string, Note>) {
  const zip = new JSZip();
  const selected = new Set(ids.filter(id => notes[id] && !notes[id].deletedAt));
  const seen = new Set<string>();
  const roots = [...selected].filter(id => {
    const ancestors = new Set<string>();
    let parent = notes[id].parentId;
    while (parent && notes[parent] && !ancestors.has(parent)) {
      if (selected.has(parent)) return false;
      ancestors.add(parent); parent = notes[parent].parentId;
    }
    return true;
  });
  const unique = (dir: string, name: string, folder = false) => {
    const clean = safeName(name), dot = folder ? -1 : clean.lastIndexOf('.');
    const stem = dot > 0 ? clean.slice(0, dot) : clean, ext = dot > 0 ? clean.slice(dot) : '';
    let file = dir + clean, i = 2;
    while (zip.files[file] || zip.files[file + '/']) file = dir + stem + ` (${i++})` + ext;
    return file;
  };
  const add = async (n: Note, dir: string) => {
    if (seen.has(n.id) || n.deletedAt) return;
    seen.add(n.id);
    if (n.type === 'folder') {
      const path = unique(dir, n.title || 'Folder', true) + '/'; zip.folder(path);
      for (const child of Object.values(notes)) if (child.parentId === n.id) await add(child, path);
      return;
    }
    if (['image', 'audio', 'video'].includes(n.type)) {
      const url = await resolveMedia(n.type === 'audio' ? n.audioUrl : n.mediaUrl);
      if (!url) throw new Error(`Missing media: ${n.title || n.id}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not download: ${n.title || n.id}`);
      const blob = await response.blob();
      const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/webm': 'webm', 'video/mp4': 'mp4', 'video/webm': 'webm' };
      const ext = extensions[blob.type.split(';')[0]] || url.split('?')[0].match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'bin';
      zip.file(unique(dir, n.metadata.originalFilename || `${n.title || n.type}.${ext}`), new Uint8Array(await blob.arrayBuffer()));
      if (n.text || n.metadata.transcript) zip.file(unique(dir, `${n.title || n.type}.md`), n.text ? noteToMd(n) : `# ${n.title}\n\n${n.metadata.transcript}\n`);
    } else zip.file(unique(dir, `${n.title || n.type}.md`), noteToMd(n));
  };
  for (const id of roots) await add(notes[id], '');
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

export async function downloadSelection(ids: string[]) {
  const st = useStore.getState();
  st.setUI({ toast: 'Preparing ZIP…' });
  try {
    const bytes = await selectionZip(ids, st.notes);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `${ids.length === 1 ? safeName(st.notes[ids[0]].title || 'Folder') : 'Stillroom-selection'}.zip`;
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    st.setUI({ toast: 'ZIP ready' });
  } catch (error) { st.setUI({ toast: `ZIP failed: ${(error as Error).message}` }); }
}
