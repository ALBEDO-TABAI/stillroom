# Progress — Stillroom (2026-10-29 JST)

## Layout
src/{App,main,Welcome}.tsx · canvas/ (Canvas, NoteView, camera, clusters, drag, shortcuts) · cards/ · chrome/ (TopBar+Search, UserMenu, Record, Bin) · overlays/ (menus, editor, slideshow, folder panel) · store/ (zustand + localStorage + IndexedDB blobs) · lib/ (tokens/constants, geometry, silhouette, layouts, exporters, capture) · fixtures/demo.ts · parity/.

## Features
All of RE_NOTES "Feature inventory" except server-only items. Mobile (<600px) record-only view with Saved phase.

## Signed-in parity (2026-10-29, second pass)
Implemented from 白's signed-in `/user` page: new-account starter canvas, @handle folder breadcrumb column, search pill growth + rich results dropdown, bin *mode* (masonry, Search in Bin, Clear All, Restore, record hidden), cover-style link card, inline-edit format pill + Contain pill, real usage figures, unpacked text rhythm fixes. Harness: `SIGNED=1 node capture.mjs` → `u_*` states vs `goldmund-research/ref/signed` (redacted).

## Test status
- vitest: 4/4.
- Signed-in: 30 captures (15 states × 2 themes): pixel 95.8–99.98% (median ≈98.65), geometry ≤2px 100% on all.
- Pixel/geometry parity (guest demo): 47 captures (23 states × 2 themes @1440×900, + 1280×800, 1920×1080, 390×844 mobile): mean pixel 99.34% (range 98.6–99.9), geometry ≤2px 100% on every state with geometry.
- Behaviour: 26/26 (adds bin mode, new-account canvas, search dropdown, folder column, inline pill)
- Earlier: 22/22 (the keyboard check flaked once in a full run, passed on rerun).

## Gaps
Signed-in: binned items' exact rendering unobserved (bin was empty; layout from code); upload/transcription progress UI not observed (would create modules); breadcrumb silhouette neck between handle and column is approximated with a plain glass pill; axis-menu side buttons were mid-animation in the reference capture (background tab), so u_axis_text pixel score is lower (95.8/97.4) though geometry matches.

Server transcription (we use browser SpeechRecognition if available, else no transcript); link preview images; accounts/sync/sharing; the signed-in /user/<name> UI (unseen); icons are our own drawings; brand word differs by design; generated fixture images differ (masked in compare).

## How to resume
`npm run dev`, open `?fixture=demo`, rerun the parity harness, look at the lowest rows in docs/parity/REPORT.md.

## Phase 3 — mutation flows on a signed-in account (2026-10-29 JST)

Captured on a throwaway account (raw captures stay outside the repo; only redacted references are used):
image / audio / video drops, canvas-menu Text and Folder, drag-into-folder, folder sub-canvas navigation,
Bin with items (axis menu, Restore, Clear All), and the sign-out flow.

Implemented:
- **Bin masonry** re-measured with real items: CSS multi-column `columns: 260px; column-gap: 4px`, padding 56/14/120,
  items opacity .6, text cards capped at 195px with a fade. Right-click → the rest blur away, **Info** pill 12px left,
  solid **Restore** pill 12px below. Empty bin hides Clear All. Clear All confirms "Permanently delete all items in Bin? This cannot be undone."
- **Transcription progress**: dropped audio shows an orange radial that breathes (blur 28↔50px, 2s), a centred
  phrase cycling every 3s with per-letter pulse (1.4s, .05s stagger), then crystallize (1.6s) + cooling (4.5s) to the base colour.
  Local-only: no speech service, so the module keeps the file name and no transcript text.
- **Folder**: hover glow follows the pointer; drop target scales 1.1 with the title pill lit.
- Harness: `u_bin_items`, `u_bin_items_axis` (dark + light); behaviour checks for audio transcription states and Clear All (28/28).

Known differences / not done:
- Folders are sub-canvases in the original (breadcrumb pills, children keep world coordinates); Stillroom still opens a folder panel.
- The original ignores dropped video files; Stillroom keeps video modules.
- Canvas-menu Text in the original creates an unpacked text with a "T" pill; ours creates the existing default.
- Signed-out landing page (marketing hero + "Request access") is not replicated.
- Desktop: `desktop/` Electron wrapper, `scripts/build-mac.sh`, see `docs/MAC_TEST.md`.
