// Bundles the Electron main process with esbuild (CommonJS).
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
await build({ bundle: true, platform: 'node', format: 'cjs', target: 'node22', logLevel: 'warning', external: ['electron'], entryPoints: [path.join(dir, 'src/main.ts')], outfile: path.join(dir, 'dist/main.cjs') });
await build({ bundle: true, platform: 'node', format: 'cjs', target: 'node22', logLevel: 'warning', external: ['electron'], entryPoints: [path.join(dir, 'src/preload.ts')], outfile: path.join(dir, 'dist/preload.cjs') });
