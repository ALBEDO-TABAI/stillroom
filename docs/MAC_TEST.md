# Stillroom — macOS (Apple Silicon) test build

Unsigned test build of the Electron wrapper (`desktop/`), arm64 only, ad-hoc signed so Apple Silicon will launch it.

## Get the app

The zip is split into 25 MB parts: `stillroom-mac-arm64-v3.zip.part00` … `partNN`, plus `MD5SUMS-stillroom-mac-arm64-v3.txt`.

```bash
md5 -r stillroom-mac-arm64-v3.zip.part*          # compare with MD5SUMS-stillroom-mac-arm64-v3.txt
cat stillroom-mac-arm64-v3.zip.part* > stillroom-mac-arm64-v3.zip
md5 -r stillroom-mac-arm64-v3.zip                # should match the .zip line
ditto -x -k stillroom-mac-arm64-v3.zip .         # keeps the framework symlinks (Finder unzip also works)
xattr -dr com.apple.quarantine Stillroom.app     # unsigned build: clear the download quarantine
open Stillroom.app
```

If macOS still says the app "is damaged" or "can't be opened", run the `xattr` line again, or right-click the app → Open.

## What to test

- First launch shows the starter canvas; everything is stored locally (localStorage + IndexedDB under the `stillroom://app` origin) and survives quitting.
- Drop an image → it appears at the cursor; drop an audio file → the orange "Transcribing…" card breathes, then crystallizes and cools.
- Right-click the canvas → Text / Folder; double-click a module → editor; Bin (bottom right) → masonry, right-click an item → Info / Restore; Clear All.
- Settings (user menu, top left), theme toggle (top right), slideshow (select + Enter), download menu (right-click a module).
- Window: traffic lights are inset below the top bar; View → Toggle Developer Tools is available for bug reports.
- v3: quit and reopen → same window size/position and the folder you had open. ⌥⌘Space from another app → Stillroom comes
  forward with a new text. Paste a URL → the link card fills in the page title/picture (needs network; offline it stays a domain card).
  File → Export Space… → a .zip; File → Import Space… brings it back. File → Show Autosave Backups opens
  `~/Library/Application Support/Stillroom/autosave/` (`latest.json` + `backups/`).
- Undo (⌘Z) after editing a title; Tab with nothing selected walks the top bar; drop 20 images → a 5-wide grid.

## Build it yourself (Linux or macOS)

```bash
npm ci && (cd desktop && npm ci)
./scripts/build-mac.sh        # needs rcodesign (RCODESIGN=/path) for the ad-hoc signature
```

Output: `/workspace/dist-parts/` (override with `OUT=`).
