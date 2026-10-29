import { expect, test, vi, afterEach } from 'vitest';
import JSZip from 'jszip';
import { blankNote } from '../src/store/store';
import { selectionZip } from '../src/lib/selectionZip';
vi.mock('../src/store/blobs', () => ({ resolveMedia: async (r: string) => r === 'idb:missing' ? undefined : r }));
afterEach(() => vi.unstubAllGlobals());

test('nested folders, repeated selection and duplicate filenames retain all live files exactly once', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } })));
  const list = [
    blankNote('folder', 0, 0, { id: 'f', title: '素材' }),
    blankNote('folder', 0, 0, { id: 'sub', title: '子目录', parentId: 'f' }),
    blankNote('folder', 0, 0, { id: 'empty', title: '空目录', parentId: 'f' }),
    ...['a', 'b'].map(id => blankNote('image', 0, 0, { id, title: '同名', parentId: 'sub', mediaUrl: `idb:${id}`, metadata: { originalFilename: 'photo.png' } })),
    blankNote('image', 0, 0, { id: 'deleted', parentId: 'f', deletedAt: 1, mediaUrl: 'idb:missing' }),
    blankNote('link', 0, 0, { id: 'link', title: 'example', metadata: { url: 'https://example.com' } }),
  ];
  const zip = await JSZip.loadAsync(await selectionZip(['f', 'a', 'sub', 'link'], Object.fromEntries(list.map(n => [n.id, n]))));
  expect(Object.keys(zip.files)).toEqual(['素材/', '素材/子目录/', '素材/子目录/photo.png', '素材/子目录/photo (2).png', '素材/空目录/', 'example.md']);
  expect(await zip.file('素材/子目录/photo.png')!.async('uint8array')).toEqual(new Uint8Array([1, 2, 3]));
  expect(await zip.file('example.md')!.async('string')).toContain('https://example.com');
});

test('audio and video downloads preserve the original bytes', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(new Uint8Array([4, 5, 6]), { headers: { 'Content-Type': url.includes('audio') ? 'audio/mpeg' : 'video/mp4' } })));
  const a = blankNote('audio', 0, 0, { id: 'a', title: '录音', audioUrl: 'idb:audio' });
  const v = blankNote('video', 0, 0, { id: 'v', title: '影片', mediaUrl: '/video.mp4' });
  const zip = await JSZip.loadAsync(await selectionZip(['a', 'v'], { a, v }));
  expect(Object.keys(zip.files)).toEqual(['录音.mp3', '影片.mp4']);
  expect(await zip.file('影片.mp4')!.async('uint8array')).toEqual(new Uint8Array([4, 5, 6]));
});

test('missing media fails the download instead of silently producing an incomplete ZIP', async () => {
  const n = blankNote('image', 0, 0, { id: 'a', title: 'Lost image', mediaUrl: 'idb:missing' });
  await expect(selectionZip(['a'], { a: n })).rejects.toThrow('Missing media: Lost image');
});
