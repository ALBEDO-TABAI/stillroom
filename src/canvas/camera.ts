import { useStore } from '../store/store';
import { ZOOM_MIN, ZOOM_MAX } from '../lib/constants';
import type { Cam } from '../store/types';

export const clampZ = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
export const toWorld = (sx: number, sy: number, c: Cam = useStore.getState().cam) => ({ x: (sx - c.x) / c.z, y: (sy - c.y) / c.z });
export const toScreen = (wx: number, wy: number, c: Cam = useStore.getState().cam) => ({ x: wx * c.z + c.x, y: wy * c.z + c.y });

/** Zoom about a screen point. */
export function zoomAt(sx: number, sy: number, z: number, anim = 0) {
  const c = useStore.getState().cam;
  const nz = clampZ(z);
  const k = nz / c.z;
  useStore.getState().setCam({ x: sx - (sx - c.x) * k, y: sy - (sy - c.y) * k, z: nz }, anim);
}
/** Frame a world rectangle in the viewport. */
export function frameRect(r: { x: number; y: number; w: number; h: number }, opts: { pad?: number; maxZ?: number; anim?: number } = {}) {
  const W = innerWidth, H = innerHeight, pad = opts.pad ?? 120;
  const z = clampZ(Math.min((W - 2 * pad) / r.w, (H - 2 * pad) / r.h, opts.maxZ ?? ZOOM_MAX));
  useStore.getState().setCam({ x: Math.round(W / 2 - (r.x + r.w / 2) * z), y: Math.round(H / 2 - (r.y + r.h / 2) * z), z }, opts.anim ?? 520);
}

/** Wheel classifier: pinch → zoom; mouse wheel notches → zoom; trackpad two-finger → pan. */
let acc = 1, raf = 0, anchor = { x: 0, y: 0 };
export function onWheel(e: WheelEvent) {
  e.preventDefault();
  const st = useStore.getState();
  if (e.ctrlKey) {
    const d = Math.max(-10, Math.min(10, e.deltaY));
    zoomAt(e.clientX, e.clientY, st.cam.z * (1 - 0.01 * d));
    return;
  }
  const isPan = e.deltaMode === 0 && (Math.abs(e.deltaX) > 0 || !Number.isInteger(e.deltaY) || (Math.abs(e.deltaY) > 0 && Math.abs(e.deltaY) < 50));
  if (isPan) {
    st.setCam({ x: st.cam.x - e.deltaX, y: st.cam.y - e.deltaY, z: st.cam.z });
    return;
  }
  const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
  acc *= Math.pow(0.998, dy);
  anchor = { x: e.clientX, y: e.clientY };
  if (!raf) raf = requestAnimationFrame(() => {
    raf = 0;
    const z = useStore.getState().cam.z * acc; acc = 1;
    zoomAt(anchor.x, anchor.y, z, 60);
  });
}
export function keyZoom(dir: 1 | -1) {
  const z = useStore.getState().cam.z * (dir > 0 ? 1.12 : 1 / 1.12);
  zoomAt(innerWidth / 2, innerHeight / 2, z, 180);
}
export function resetView() { useStore.getState().setCam({ x: 0, y: 0, z: 1 }, 580); }
