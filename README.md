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

More: `?fixture=stress&n=500` (synthetic big canvas), `node parity/audit.mjs` (perf, IME, paste, a11y, window-size, offline probes → `docs/audit/`).
Keyboard: ⌘⇧E exports the whole space as a .zip (JSON + media), ⌘⇧O imports one. Audit and decisions: `docs/AUDIT.md`; changes: `CHANGELOG.md`.

Mac app (`desktop/`): menu bar with ⌘ shortcuts, remembered window, ⌥⌘Space quick capture, autosave to
`~/Library/Application Support/Stillroom/autosave/` with rotating backups, link previews fetched and cached in the main process.
See `docs/MAC_TEST.md`.

Link previews: the web development server and `npm run preview` expose `/api/link-preview`; the Mac app uses the same resolver through its main process. It reads public page metadata (Open Graph, Twitter cards, JSON-LD and discovered JSON oEmbed), follows public redirects, and saves covers in IndexedDB. A link's context menu offers **Refresh preview**. Pages requiring login, blocking automated access or publishing no cover retain a text card. A standalone static `dist/` deployment needs the same preview API behind its origin; browser-only cross-site fetching is not supported.
