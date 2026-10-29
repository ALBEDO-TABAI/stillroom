import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import ipaddr from 'ipaddr.js';
import { load } from 'cheerio/slim';

export type LinkPreview = { url: string; title?: string; description?: string; site?: string; image?: string };
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const MAX_BYTES = 3 * 1024 * 1024;
export const publicAddress = (address: string) => ipaddr.isValid(address) && ipaddr.process(address).range() === 'unicast';
export function publicURL(input: string, base?: string) {
  const u = new URL(input, base), host = u.hostname.replace(/^\[|\]$/g, '');
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || (u.port && !['80', '443'].includes(u.port)) || !host.includes('.') && !isIP(host) || host.endsWith('.localhost') || host === 'localhost' || isIP(host) && !publicAddress(host))
    throw new Error('Only public web links are supported');
  u.hash = ''; return u;
}

/** Validate at connection time, including redirects, so DNS cannot redirect previews onto the local network. */
export async function fetchPublic(input: string, referer?: string, redirects = 0, deadline = Date.now() + 8000): Promise<{ url: string; type: string; body: Buffer }> {
  const url = publicURL(input);
  if (Date.now() >= deadline) throw new Error('Preview timed out');
  if (redirects > 4) throw new Error('Too many redirects');
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).get(url, {
      signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      headers: { 'user-agent': UA, accept: 'text/html,application/json,image/*;q=0.9,*/*;q=0.5', 'accept-encoding': 'gzip, deflate, br', ...(referer ? { referer } : {}) },
      lookup: (host, options, callback: any) => {
        lookup(host, { all: true }).then(addresses => {
          if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new Error('Private network address rejected');
          if ((options as any).all) callback(null, addresses);
          else { const address = addresses.find(a => a.family === 4) ?? addresses[0]; callback(null, address.address, address.family); }
        }).catch(error => callback(error));
      },
    }, response => {
      const status = response.statusCode ?? 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        try { resolve(fetchPublic(publicURL(response.headers.location, url.href).href, referer, redirects + 1, deadline)); } catch (error) { reject(error); }
        return;
      }
      if (status < 200 || status >= 300) { response.resume(); reject(new Error(`HTTP ${status}`)); return; }
      const encoding = response.headers['content-encoding'];
      const stream = encoding === 'gzip' ? response.pipe(createGunzip()) : encoding === 'br' ? response.pipe(createBrotliDecompress()) : encoding === 'deflate' ? response.pipe(createInflate()) : response;
      const chunks: Buffer[] = []; let bytes = 0;
      stream.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) { request.destroy(); stream.destroy(); reject(new Error('Preview resource too large')); return; }
        chunks.push(Buffer.from(chunk));
      });
      stream.on('end', () => resolve({ url: url.href, type: response.headers['content-type'] ?? '', body: Buffer.concat(chunks) }));
      stream.on('error', reject); response.on('error', reject);
    });
    request.on('error', reject);
  });
}

const clean = (value: unknown, max = 300) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) || undefined : undefined;
const webURL = (value: unknown, base: string) => { try { return typeof value === 'string' ? publicURL(value, base).href : undefined; } catch { return undefined; } };

export function parsePreview(html: string, url: string) {
  const $ = load(html), tags = new Map<string, string[]>();
  $('meta').each((_i, el) => {
    const key = ($(el).attr('property') || $(el).attr('name') || '').toLowerCase(), value = $(el).attr('content');
    if (value) tags.set(key, [...(tags.get(key) ?? []), value]);
  });
  const meta = (...keys: string[]) => keys.flatMap(k => tags.get(k) ?? []).map(v => clean(v)).find(Boolean);
  const base = webURL($('base').attr('href'), url) ?? url;
  const structured: any[] = [];
  $('script[type="application/ld+json"]').each((_i, el) => {
    try { const data = JSON.parse($(el).text()); for (const item of Array.isArray(data) ? data : [data]) structured.push(...(item?.['@graph'] ?? [item])); } catch { /* invalid publisher JSON */ }
  });
  const story = structured.find(v => /Article|VideoObject|Product|WebPage|BlogPosting/.test(String(v?.['@type']))) ?? structured[0];
  const imageValues = (v: any): string[] => typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(imageValues) : v && typeof v === 'object' ? imageValues(v.url ?? v.contentUrl) : [];
  const images = [...new Set([
    ...(tags.get('og:image:secure_url') ?? []), ...(tags.get('og:image') ?? []), ...(tags.get('twitter:image') ?? []), ...(tags.get('twitter:image:src') ?? []),
    ...imageValues(story?.image ?? story?.thumbnailUrl), $('link[rel="image_src"]').attr('href'),
  ].map(v => webURL(v, base)).filter((v): v is string => !!v))].slice(0, 3);
  const preview: LinkPreview = { url, title: meta('og:title', 'twitter:title') ?? clean(story?.headline ?? story?.name) ?? clean($('title').text()),
    description: meta('og:description', 'twitter:description', 'description') ?? clean(story?.description), site: meta('og:site_name') };
  const oembed = $('link').toArray().find(el => ($(el).attr('type') ?? '').toLowerCase() === 'application/json+oembed');
  return { preview, images, oembed: oembed ? webURL($(oembed).attr('href'), base) : undefined };
}

async function resolvePreview(input: string): Promise<LinkPreview> {
  const url = publicURL(input);
  const deadline = Date.now() + 18000;
  const request = (url: string, referer?: string) => fetchPublic(url, referer, 0, deadline);
  let result: LinkPreview = { url: url.href }, images: string[] = [], endpoint: string | undefined;
  try {
    const response = await request(url.href);
    result.url = response.url;
    if (/html/i.test(response.type)) {
      const charset = response.type.match(/charset=([^;\s]+)/i)?.[1] ?? response.body.subarray(0, 1024).toString('latin1').match(/charset=["']?([\w-]+)/i)?.[1] ?? 'utf-8';
      const parsed = parsePreview(new TextDecoder(charset.replace(/["']/g, '')).decode(response.body), response.url);
      result = parsed.preview; images = parsed.images; endpoint = parsed.oembed;
    }
  } catch { /* metadata providers may still respond when the main page is unavailable */ }
  if (!endpoint && /(^|\.)(youtube\.com|youtu\.be)$/.test(url.hostname)) endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.href)}`;
  if (endpoint && (!result.title || !images.length)) {
    try {
      const data = JSON.parse((await request(endpoint)).body.toString('utf8'));
      result.title ||= clean(data.title); result.site ||= clean(data.provider_name);
      const thumbnail = webURL(data.thumbnail_url ?? (data.type === 'photo' ? data.url : undefined), endpoint);
      if (thumbnail) images.push(thumbnail);
    } catch { /* keep any valid page metadata */ }
  }
  for (const image of images) {
    try {
      const response = await request(image, result.url);
      const type = response.type.split(';')[0].toLowerCase();
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(type)) continue;
      result.image = `data:${type};base64,${response.body.toString('base64')}`; break;
    } catch { /* try the next publisher-supplied image */ }
  }
  return result;
}

const cache = new Map<string, { value: LinkPreview; expires: number }>();
const pending = new Map<string, Promise<LinkPreview>>();
export function getLinkPreview(input: string, refresh = false) {
  const url = publicURL(input);
  // Tracking parameters do not change the page preview.
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|spm_|trackid$|vd_source$)/i.test(key)) url.searchParams.delete(key);
  const key = url.href, hit = cache.get(key);
  if (!refresh && hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
  if (pending.has(key)) return pending.get(key)!;
  const task = resolvePreview(key).then(value => {
    if (cache.size >= 64) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, expires: Date.now() + (value.image ? 86400000 : 180000) }); return value;
  }).finally(() => pending.delete(key));
  pending.set(key, task); return task;
}
