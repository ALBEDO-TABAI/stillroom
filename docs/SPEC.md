# Stillroom design spec (measured from the reference; see goldmund-research)

Implemented 1:1 in Stillroom as `src/styles/tokens.css` and `src/lib/constants.ts` (own `--sr-*` names).

## 1. Grid / geometry (world units = px at zoom 1)
- Module width 260; text card padding 17; corner radius 24 (user-adjustable 24–64 via "Radius"); text card min-height 66 (or explicit frameH, top-aligned); packed text cap 195 (=260·3/4); link card aspect 195/260.
- Module gap 12 (user "Gap" 0–12); magnetic snap radius 26; cluster membership tolerance 24.
- Cluster silhouette: union of rects outset 24, corner R 48, concave fillet r = min(48, edge/2); stroke 1px rgba(255,255,255,.18) dark / rgba(0,0,0,.14) light, shown on hover of a member.
- Zoom 0.05–3; keyboard step ×1.12 / 180 ms; reset 580 ms. Fit camera for demo at 1440×900 = {x 668, y 494, z 0.74148}.
- Folder dblclick zoom: z = 0.47682·min(W,H)/size, centred.

## 2. Colour
| token | light | dark |
|---|---|---|
| canvas | #E5E5EA | #000000 |
| card / ink | #FFFFFF / #212121 | #141414 / #F5F5F5 |
| glass (chrome) | rgba(218,218,222,.70) | rgba(44,44,46,.60) |
| glass hover / press | .72 / .74 steps (#C8C8CE, #BABAC0) | rgba(58,58,62,.62) / rgba(74,74,78,.64) |
| solid / on | #DADADE / #C8C8CC | #2C2C2E / #3A3A3C |
| tint / on | rgba(0,0,0,.04/.06) | rgba(255,255,255,.06/.10) |
| text / muted / faint | #111 / #6D6D72 / #AEAEB2 | #F0F0F0 / #8E8E93 / #7C7C7E |
| editor window | rgba(255,255,255,.7) | rgba(20,20,20,.6) |
| selection outline | 1.5px rgba(0,0,0,.3) | 1.5px rgba(255,255,255,.3) |
| toggle off / sub-panel | #CFCED3 / rgba(0,0,0,.035) | #3A3A3C / rgba(255,255,255,.04) |
Accent #FFA000 (record), destructive #FF3B30. Glass blur 30px saturate 160%.

## 3. Type
Inter / -apple-system stack. Buttons 15px/500. Card title 18·scale, body 12·scale, title→body 12. Info panel label 11/500, value 14/500. Mobile "Saved" 30/500. Time row opacity .1 rest → .5 hover.

## 4. Buttons & chrome
Button box 42 h, icon button 48 w, text padding 14, pill radius 999, row radius 9; buttons in one pill gap 6, neck r 10. Top bar 60 h, edge inset 14. Record 48×42 (desktop, hover scale 1.09, `all .5s ease`, bottom padding 20), 136×119 centred (mobile).
Canvas menu (z500): icon buttons at ±32px around the click (Text top, Link right, Camera bottom, Folder left).
Axis menu (z600): other modules blur(20px); buttons 12px from card edges. Info panel z650, glass, 200 w, right edge = card left − 3.
Editor window: column 720, scroll padding 100/44/80, chrome row 18/16/0, format pill pad 6/8 gap 6 buttons 30×30 r9; edited card blurred 20px. Slideshow z1000, backdrop blur 20 transparent, media 80% viewport height, no chrome.
User menu: toggles 34×20, slider knob 15, shortcuts panel left 280, width 384, grid 160px / 1fr.

## 5. Motion
Durations hover 120, menu 180, travel 260, chrome 340, camera 520, exit 200 ms. Curves: menu (.2,.8,.2,1), settle (.22,1,.36,1), exit (.4,0,.2,1). Record/mobile phases 0.5 s ease; "Saved" holds 1.5 s.

## 6. Breakpoints
<600px: mobile capture-only (no canvas/top bar/bin). <928px: compact chrome checks in a few places.

## 7. Signed-in additions
Search pill widths 180 / 260 / 420 (narrow 220); dropdown 420 × ≤400, radius 0 0 14 14, rows 10/14, title 14/500, preview 13, meta 11/500 @ .6, highlight rgba(255,160,0,.35).
Breadcrumb column: pills under the handle at top 48, gap 6. Bin mode masonry: 3 cols, gap 10, max 960, pad 56/24/120.
Inline edit: format pill at −39 world px (translate −50%,−50%), pad 6/8 gap 6, buttons 30×≥30 r9; Contain pill 46×42 at +39 below.
Link cover: veil blur 22 over 73% height, caption 14/16/16, title 18/500 white, domain 9px .72.
Unpacked text: body left-aligned, line-height ≈1.41, list tail margin .7em, title gap 12 when a body exists.
