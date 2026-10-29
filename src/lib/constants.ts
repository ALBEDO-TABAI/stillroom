// Measured constants (docs/SPEC.md). World units are canvas pixels at zoom 1.
export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 3;
export const CARD_W = 260;           // default module width
export const CARD_PAD = 17;          // text-card padding
export const CARD_RADIUS = 24;       // module corner
export const CARD_MIN_H = 66;        // text-card floor
export const PACKED_MAX_H = 195;     // packed text card cap (= 260 * 3/4)
export const LINK_RATIO = 195 / 260; // link card aspect
export const TITLE_FS = 18;          // card title size (x titleFontScale)
export const BODY_FS = 12;           // card body size
export const TITLE_GAP = 12;         // title → body
export const GAP_DEFAULT = 12;       // module gap (magnetic snap)
export const SNAP_RADIUS_DEFAULT = 26;
export const CLUSTER_TOL = 24;       // modules closer than this belong to one cluster
export const CLUSTER_PAD = 24;       // silhouette outset
export const CLUSTER_R = 48;         // silhouette corner radius
export const BTN_H = 42;             // the button box
export const BTN_W = 48;
export const BTN_PAD = 14;
export const GROUP_GAP = 6;          // pills in one silhouette
export const NECK_R = 10;            // concave join between pills
export const AXIS_GAP = 12;          // axis menu distance from the module
export const TOPBAR_H = 60;
export const EDGE = 14;              // chrome inset from the viewport edge
export const KEY_ZOOM_STEP = 1.12;
export const KEY_ZOOM_MS = 180;
export const RESET_MS = 580;
