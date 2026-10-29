import { afterEach, expect, test, vi } from 'vitest';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { lookup } from 'node:dns/promises';
import { fetchPublic, parsePreview, publicAddress, publicURL } from '../server/link-preview';
import { webLink } from '../src/lib/capture';
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

test('publisher tags work regardless of attribute order, quoting, case or relative image paths', () => {
  const p = parsePreview(`<base href="https://cdn.example.com/assets/"><title>Fallback</title>
    <meta CONTENT='标题 &amp; 内容' PROPERTY=og:title><meta name="description" content="A summary">
    <meta content="/cover.jpg" property="og:image"><meta property="og:image" content="https://cdn.example.com/second.jpg">
    <link type="application/json+oembed" rel="alternate" href="/embed?format=json&amp;id=1">`, 'https://example.com/article');
  expect(p.preview.title).toBe('标题 & 内容'); expect(p.preview.description).toBe('A summary');
  expect(p.images).toEqual(['https://cdn.example.com/cover.jpg', 'https://cdn.example.com/second.jpg']);
  expect(p.oembed).toBe('https://cdn.example.com/embed?format=json&id=1');
});

test('structured metadata supplies a real cover; a title-only page stays a title-only card', () => {
  const p = parsePreview(`<script type="application/ld+json">{"@graph":[{"@type":"Article","headline":"Story","image":[{"url":"//images.example.com/story.jpg"}]}]}</script>`, 'https://example.com/story');
  expect(p.preview.title).toBe('Story'); expect(p.images).toEqual(['https://images.example.com/story.jpg']);
  expect(parsePreview('<title>Plain page</title>', 'https://example.com/').images).toEqual([]);
});

test('public-link fetching rejects private IPv4, IPv6, mapped addresses and non-web URLs', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1']) expect(publicAddress(address)).toBe(false);
  expect(publicAddress('8.8.8.8')).toBe(true); expect(publicAddress('2606:4700:4700::1111')).toBe(true);
  for (const url of ['file:///etc/passwd', 'http://127.1/', 'http://2130706433/', 'http://[::1]/', 'http://a:b@example.com/', 'http://example.com:8787/', 'http://localhost/']) expect(() => publicURL(url)).toThrow();
});

test('a public hostname resolving privately is rejected by the connection lookup', async () => {
  vi.mocked(lookup).mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as any);
  vi.spyOn(https, 'get').mockImplementation(((_url: any, options: any) => {
    const req = new EventEmitter();
    queueMicrotask(() => options.lookup('public.example', {}, (error: Error) => req.emit('error', error)));
    return req;
  }) as any);
  await expect(fetchPublic('https://public.example/')).rejects.toThrow('Private network address');
});

test('redirects cannot reach a local service', async () => {
  const get = vi.spyOn(https, 'get').mockImplementation(((_url: any, _options: any, response: any) => {
    const req = new EventEmitter();
    queueMicrotask(() => response({ statusCode: 302, headers: { location: 'http://127.0.0.1/' }, resume() {} }));
    return req;
  }) as any);
  await expect(fetchPublic('https://public.example/')).rejects.toThrow('Only public web links');
  expect(get).toHaveBeenCalledTimes(1);
});

test('pasted root queries, fragments, short links and international domains stay links', () => {
  expect(webLink('https://example.com?article=1#part')).toBe('https://example.com/?article=1#part');
  expect(webLink('b23.tv/abc')).toBe('https://b23.tv/abc');
  expect(webLink('https://例子.中国/文章')).toContain('xn--');
  for (const text of ['a normal sentence', 'Hello.', '1.2', 'ftp://example.com/file', 'mailto:hello@example.com', 'hello@example.com']) expect(webLink(text)).toBeNull();
});
