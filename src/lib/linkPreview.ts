import { desktop } from '../store/persist';
import { useStore } from '../store/store';
import { getBlob, putBlob } from '../store/blobs';

type Preview = { url: string; title?: string; description?: string; site?: string; image?: string };
const pending = new Map<string, Promise<Preview | null>>();

export async function refreshLinkPreview(id: string, refresh = false) {
  const note = useStore.getState().notes[id];
  if (!note || note.deletedAt || note.type !== 'link') return false;
  const url = note.metadata.url || note.title;
  try {
    if (!pending.has(url)) {
      const request = desktop ? desktop.linkPreview(url, refresh) : fetch(`/api/link-preview?url=${encodeURIComponent(url)}${refresh ? '&refresh=1' : ''}`, { signal: AbortSignal.timeout(22000) })
        .then(async response => { if (!response.ok) throw new Error('Preview unavailable'); return response.json() as Promise<Preview>; });
      pending.set(url, request.finally(() => pending.delete(url)));
    }
    const preview = await pending.get(url)!;
    let image: string | undefined;
    if (preview?.image?.startsWith('data:image/')) {
      const blob = await (await fetch(preview.image)).blob();
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(n => n.toString(16).padStart(2, '0')).join('');
      const key = `link-preview-${hash}`;
      image = await getBlob(key) ? `idb:${key}` : await putBlob(key, blob);
    }
    const current = useStore.getState().notes[id];
    if (!current || current.deletedAt || (current.metadata.url || current.title) !== url) return false;
    useStore.getState().update(id, { metadata: { previewUpdatedAt: Date.now(),
      ...(preview?.title ? { linkTitle: preview.title } : {}), ...(preview?.description ? { linkDescription: preview.description } : {}),
      ...(preview?.site ? { linkSite: preview.site } : {}), ...(image ? { linkImage: image } : {}) } });
    return !!preview?.title;
  } catch {
    const current = useStore.getState().notes[id];
    if (current && !current.deletedAt && (current.metadata.url || current.title) === url) useStore.getState().update(id, { metadata: { previewUpdatedAt: Date.now() } });
    return false;
  }
}
