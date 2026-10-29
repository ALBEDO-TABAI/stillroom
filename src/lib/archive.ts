// Whole-space backup: one .zip with space.json (modules, camera, prefs) and media/<key> for every stored blob.
import JSZip from 'jszip';
import { useStore } from '../store/store';
import { getBlob, putBlob } from '../store/blobs';
import type { Note } from '../store/types';

const refs = (n: Note) => Object.values({ ...(n as any), ...n.metadata }).filter((v): v is string => typeof v === 'string' && v.startsWith('idb:'));

export async function exportSpace(): Promise<Blob> {
  const st = useStore.getState();
  const notes = st.order.map(id => st.notes[id]).filter(Boolean);
  const zip = new JSZip();
  zip.file('space.json', JSON.stringify({ app: 'stillroom', version: 1, exportedAt: new Date().toISOString(), notes, cam: st.cam, prefs: st.prefs }, null, 1));
  for (const key of new Set(notes.flatMap(refs).map(r => r.slice(4)))) { const b = await getBlob(key); if (b) zip.file(`media/${key}`, b); }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}
export async function downloadSpace() {
  const b = await exportSpace(); const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = `stillroom-space-${new Date().toISOString().slice(0, 10)}.zip`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
/** Replaces the current space; callers confirm first. */
export async function importSpace(file: Blob) {
  const zip = await JSZip.loadAsync(file);
  const j = zip.file('space.json'); if (!j) throw new Error('Not a Stillroom space archive');
  const data = JSON.parse(await j.async('string'));
  if (data?.app !== 'stillroom' || !Array.isArray(data.notes)) throw new Error('Not a Stillroom space archive');
  const notes: Note[] = data.notes.filter((n: any) => n && typeof n.id === 'string' && typeof n.type === 'string');
  for (const f of Object.values(zip.files)) if (!f.dir && f.name.startsWith('media/')) await putBlob(f.name.slice(6), await f.async('blob'));
  const st = useStore.getState(); st.setUI({ openFolderId: null }); st.replaceAll(notes, data.cam);
  if (data.prefs) st.setPrefs(data.prefs);
  return notes.length;
}
export function pickAndImport() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.zip,application/zip';
  i.onchange = async () => {
    const f = i.files?.[0]; if (!f) return;
    if (!confirm('Replace this space with the archive? Export first if you want to keep what is here.')) return;
    try { const n = await importSpace(f); useStore.getState().setUI({ toast: `Imported ${n} modules` }); } catch (err) { alert((err as Error).message || String(err)); }
  };
  i.click();
}
// The Mac app menu (and anything else) can ask for these without importing the module.
addEventListener('sr:export-space', () => { void downloadSpace(); });
addEventListener('sr:import-space', () => pickAndImport());
