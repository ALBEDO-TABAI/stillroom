# Stillroom

An infinite-canvas place to collect notes, voice, images, video, links and folders. Local-first: everything lives in localStorage + IndexedDB.

```
npm i
npm run dev          # http://127.0.0.1:5410/
                     # first run = the new-account canvas (6 modules), saved locally
                     # /user/<name> sets the handle
                     # ?fixture=demo  → the 16-module guest demo canvas (not persisted)
                     # ?fixture=account → the new-account canvas (not persisted); ?fixture=media → demo + voice memo + video
                     # ?cam=x,y,z  ?gap=n  (parity harness)
                     # ?theme=dark|light, ?chrome=full
npm test             # vitest
npm run build
```
Parity harness (needs the dev server): `cd parity && node capture.mjs && SIGNED=1 node capture.mjs && node compare.mjs && node behaviour.mjs` (SIGNED=1 = the signed-in states, compared against redacted refs) → `docs/parity/REPORT.md`, `docs/parity/sbs/*.png`, `docs/parity/behaviour.json`.
