# Stillroom audit — round 5 (2026-10-29 JST)

An end-to-end pass as product, design and engineering, done with Playwright walkthroughs (`parity/audit.mjs`, results
in `docs/audit/probes.json`), keyboard-only use, synthetic stress fixtures (`?fixture=stress&n=N`) and code reading.
All data is synthetic. P0 = loses or hides the user's work; P1 = breaks a common flow; P2 = rough edge.

## Findings and what was done

| # | Pri | Finding | Status |
|---|---|---|---|
| 1 | P0 | **Undo skipped text edits.** Title/body edits on the canvas, the inline pill (align, weight, level, Block) and the editor window changed the note without a checkpoint, so ⌘Z jumped back past them. | Fixed: one checkpoint per committed edit; the editor window takes one per editing session. Behaviour check. |
| 2 | P0 | **Paste inside a folder put the copy at the root** (invisible from where you pasted). | Fixed: pasted copies join the open folder. ⌘N also creates in the open folder now. |
| 3 | P0 | Damaged `localStorage` would leave an empty canvas. | Fixed earlier this round: the damaged copy is set aside (`stillroom.notes.damaged-<ts>`), the last good generation (`stillroom.notes.bak`) is restored and a toast says so. A full disk shows "Storage is full — export your space to keep a copy." |
| 4 | P0 | No way to take the whole space elsewhere. | New: **Export space** (⌘⇧E) writes `stillroom-space-<date>.zip` = `space.json` + `media/<key>` for every blob; **Import space** (⌘⇧O) asks, then replaces. Also in the Mac File menu. Behaviour check (round trip). |
| 5 | P1 | **Rich-text paste flattened lists** into one line. | Fixed: HTML is rebuilt from an allow-list (p, br, ul/ol/li, strong/em/u/s, a with http(s)/mailto only, h1–h3, blockquote, code/pre, mark); script/style/iframe/svg are dropped with their content. First short heading/line becomes the title. See `docs/img/before-after/rich_paste_before_after.png`. |
| 6 | P1 | **Tab was captured** to cycle modules, so keyboard users could not reach the top bar, search, Bin or record button. | Fixed: Tab walks modules only while a module is selected and focus is not on a control; otherwise native focus order. `tab_focus_before_after.png`. |
| 7 | P1 | **Dropping many files made one endless row** (20 images → 8341 px wide). | Fixed: rows of 5 at the drop point (1756 px). `drop20_before_after.png`. |
| 8 | P1 | **P layout froze the window on big canvases** (500 modules 3.6 s, 1000 modules 20.6 s). The cluster outline scanned every rectangle for every grid cell (O(n³)) and the cluster search compared all pairs. | Fixed: occupancy grid + x-sweep. Now 0.9 s / 2.9 s in the dev build (most of what is left is React rendering 1000 cards). |
| 9 | P1 | Enter in a frameless "T" text did nothing. | Fixed: Enter (not while an IME is composing) moves into the body; Backspace on an empty body returns to the title; Escape leaves. |
| 10 | P1 | Deleting a folder: what happens to its contents was undefined. | Matched the original (observed on a test account: children reappear on the parent canvas, the binned folder shows "0 modules"): contents move up one level. |
| 11 | P2 | Reload always went back to the root canvas. | The open folder is remembered (`stillroom.folder`) and reopened if it still exists. |
| 12 | P2 | `prefers-reduced-motion` still left 6 looping animations (breathing record button, transcribing card, landing drift). | Fixed: a global clamp ends decorative loops; state stays readable from text and colour. |
| 13 | P2 | Landing page was a single static screen. | Scroll story: drift, five captioned steps with dots (wheel, arrows, PageUp/Down, space, Home/End, touch), letter page with "Try it". |

## Checked and fine

- **Performance:** pan/zoom hold 60 fps at 100, 500 and 1000 modules (worst frame 16.8 ms); load 0.35 / 0.59 / 0.94 s.
- **CJK / IME:** Enter while composing stays in the title; Chinese and Japanese text wrap and search correctly (`docs/audit/cjk_text.png`).
- **Long text:** packed cards cap at 260×195 and fade; the editor scrolls.
- **Windows** 800×500, 1024×640, 2560×1440, 390×844: no chrome overlaps or controls off-screen (`docs/audit/window_*.png`).
- **a11y:** every button has an accessible name; focus ring visible on chrome buttons.
- **Offline:** zero external requests from the web build; everything is local.
- **Search** already covers titles, bodies, link titles/domains and voice transcripts.
- **Trackpad:** two-finger pan, pinch (ctrl+wheel) and mouse-wheel notches are distinguished (behaviour check).

## Mac app additions

- Menu bar: File (New Text ⌘N, Quick Capture ⌥⌘Space, Export ⌘⇧E, Import ⌘⇧O, Show Autosave Backups), Edit, View (Search ⌘F, full screen), Window.
- Window size, position, maximised and full-screen state are remembered; a position on an unplugged display is dropped.
- **Global quick capture** ⌥⌘Space: brings Stillroom forward and starts a new text at the centre (fails quietly if another app owns the shortcut).
- **Autosave to disk:** `~/Library/Application Support/Stillroom/autosave/latest.json` (atomic write, 1.5 s after a change) and a timestamped backup at most every 30 min, newest 48 kept. Media stays in IndexedDB; use Export for a full copy.
- **Link previews:** the main process fetches the page (6 s timeout, no cookies, first 512 KB), reads Open Graph / Twitter / `<title>` tags and caches them for 7 days (`og-cache.json`, max 2000). The renderer never touches the network; offline, the card keeps showing the domain. Preload exposes only `autosave`, `linkPreview` and menu commands.

## Considered and not done

- **Local transcription (whisper WASM):** declined for now. The smallest usable multilingual model is ~75 MB (tiny) and
  ~140 MB (base); bundling it would triple the download, and quality on tiny is poor for Chinese/Japanese. The
  transcribing card and transcript field are ready; a later build could fetch the model on demand and run it in a worker.
- **Export/import entries in the user menu:** left out so the menu stays identical to the original (parity); they live
  in shortcuts and the Mac File menu.
- **Light-theme references for `in_folder` / `new_text`:** not derivable — no light capture of those states exists and
  their colours were never observed. The landing is always dark, so it needs none.
- **Dropped grid avoids existing modules:** the grid starts at the drop point and can cover modules (as single drops do). A free-space search would change the original's behaviour.
- **Text edits inside the editor are one undo step per session** (TipTap keeps its own fine-grained undo while it is open).
- **Notarised signing** needs an Apple Developer ID; builds stay ad-hoc signed.
