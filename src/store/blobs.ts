// Local media store: dropped / recorded files live in IndexedDB, notes reference them as "idb:<key>".
const DB = 'stillroom-media', OS = 'blobs';
let dbp: Promise<IDBDatabase> | null = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(OS);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
const urls = new Map<string, string>();
export async function putBlob(key: string, blob: Blob) {
  const d = await db();
  await new Promise<void>((res, rej) => { const t = d.transaction(OS, 'readwrite'); t.objectStore(OS).put(blob, key); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
  const u = URL.createObjectURL(blob); urls.set(key, u);
  return `idb:${key}`;
}
export async function getBlob(key: string): Promise<Blob | null> {
  const d = await db();
  return new Promise((res) => { const r = d.transaction(OS).objectStore(OS).get(key); r.onsuccess = () => res(r.result ?? null); r.onerror = () => res(null); });
}
export async function delBlob(key: string) {
  const d = await db();
  d.transaction(OS, 'readwrite').objectStore(OS).delete(key);
}
/** Resolve a stored media reference to something an <img>/<video>/<audio> can load. */
export async function resolveMedia(ref?: string): Promise<string | undefined> {
  if (!ref) return undefined;
  if (!ref.startsWith('idb:')) return ref;
  const key = ref.slice(4);
  if (urls.has(key)) return urls.get(key);
  const b = await getBlob(key);
  if (!b) return undefined;
  const u = URL.createObjectURL(b); urls.set(key, u); return u;
}
export function resolveSync(ref?: string) {
  if (!ref) return undefined;
  if (!ref.startsWith('idb:')) return ref;
  return urls.get(ref.slice(4));
}
