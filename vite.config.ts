import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { linkPreviewPlugin } from './server/preview-plugin.ts';
export default defineConfig({ plugins: [react(), linkPreviewPlugin()], server: { port: 5410, host: '127.0.0.1' } });
