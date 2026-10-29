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

## Phase 4 — closing the phase-3 gaps (code-only, 2026-10-29 JST)

- **Folders are sub-canvases.** The folder panel is gone. Opening a folder (handle pill → folder column) swaps the
  canvas to that folder's modules; children keep their world coordinates and the camera is not refit. The breadcrumb
  grows one glass pill per level inside the shared silhouette (`@handle` | `Folder` | `Sub folder`); the last pill
  toggles its sub-folder column, an earlier pill jumps to that level, `@handle` goes back to the root. New modules,
  the Bin and Clear All are scoped to the open folder; search opens the module's folder before framing it.
  Double-click on a folder only zooms (as in the original).
- **Video drops are ignored** (the camera/file picker accepts images and audio only).
- **Canvas menu → Text** makes a frameless paragraph text (`titleLevel: 'p'`, 12px left-aligned title); the inline
  pill shows **T** (click: T → H1 → T…), Block is dimmed, and the bottom pill shows a frame glyph while empty.
  Canvas menu → Folder is titled "New Folder".
- **Signed-out landing** (`#/welcome`, also `/welcome`, and where Sign out goes): field of our own modules at 0.85
  scale, hero 142px above the bottom, chevron, glass e-mail + accent "Request access" pair 72px above the bottom,
  footer 14px, "Sign in" top-right. Request access only stores the address in `localStorage` (`sr-access-requests`);
  Sign in is a local name prompt that opens the canvas. Always dark, like the original.
- Harness: new signed states `u_in_folder_dark`, `u_new_text_dark` (reference = account base with the measured new
  text region from the private capture), `u_landing_dark` (reference module pictures greyed; chevron position taken
  from pixels because the DOM rect was captured mid-animation). Behaviour checks 31/31 (folder navigation, T text,
  landing with zero external requests, video ignored).

## Round 5 — audit and v3 (2026-10-29 JST)

See `docs/AUDIT.md` (findings, priorities, what was declined) and `CHANGELOG.md`. Parity unchanged on unchanged states:
94 states, mean pixel 99.09 %, geometry 99.76 %. Behaviour 38/38 (7 new: Enter-to-body, undo after title edit, folder
delete + reopen, 20-file grid, Tab reaches chrome, export/import round trip, landing story). `parity/audit.mjs` re-runs the
probes; `parity/before_after.mjs` regenerates `docs/img/before-after/` against an older build on :5411.
Mac build v3: `NAME=stillroom-mac-arm64-v3 ./scripts/build-mac.sh`.
