import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import { getLinkPreview } from './link-preview.ts';

export function linkPreviewPlugin(): Plugin {
  const install = (server: ViteDevServer | PreviewServer) => { server.middlewares.use('/api/link-preview', async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const origin = req.headers.origin;
    let foreign = false;
    try { foreign = !!origin && new URL(origin).host !== req.headers.host; } catch { foreign = true; }
    if (req.method !== 'GET' || foreign || req.headers['sec-fetch-site'] === 'cross-site') {
      res.writeHead(403); res.end(); return;
    }
    res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    try { res.end(JSON.stringify(await getLinkPreview(url.searchParams.get('url') || '', url.searchParams.get('refresh') === '1'))); }
    catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Preview unavailable for this link' })); }
  }); };
  return { name: 'stillroom-link-preview', configureServer: install, configurePreviewServer: install };
}
