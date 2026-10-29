# Changelog

## v3 — 2026-10-29 (JST)

**Fixes**
- Undo/redo now covers text edits on the canvas, inline-pill changes and editor sessions.
- Paste and ⌘N inside a folder create there, not at the root.
- Rich-text paste keeps lists, headings, emphasis and links; scripts and styles are dropped.
- Tab reaches the top bar, search, Bin and record button; it cycles modules only while one is selected.
- Many-file drops land as a grid (rows of 5).
- P/L layouts on large canvases: 500 modules 3.6 s → 0.9 s, 1000 modules 20.6 s → 2.9 s.
- `prefers-reduced-motion` stops all decorative loops.
- Damaged storage is set aside and the last good copy restored; full storage shows a toast.

**New**
- Frameless "T" text: Enter continues in the body (IME-safe), Backspace on an empty body returns to the title.
- Folder delete hands its contents to the parent canvas; the open folder survives reload.
- Landing: drifting field, five-step scroll story with dots, letter page.
- Export / import the whole space as a .zip with media (⌘⇧E / ⌘⇧O).
- Mac: menu bar, remembered window state, ⌥⌘Space quick capture, autosave with rotating backups, cached link previews.

## v2 — 2026-10-29
Folders as sub-canvases with breadcrumb pills, T text, signed-out landing, video drops ignored.

## v1 — 2026-10-29
First Mac build of the canvas, modules, Bin, editor, slideshow, settings.
