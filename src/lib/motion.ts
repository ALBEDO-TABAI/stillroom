import { useEffect, useRef, useState } from 'react';
export const EXIT_MS = 200;
/** Per-surface arrival offset for the shared srIn/srOut keyframes. */
export function from({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number } = {}) {
  const r: Record<string, string | number> = {};
  if (x || y) r['--sr-in-t'] = `${x}px ${y}px`;
  if (s !== 1) r['--sr-in-s'] = s;
  return r as React.CSSProperties;
}
/** Keep a surface mounted for the exit animation. */
export function usePresence(open: boolean, ms = EXIT_MS) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const was = useRef(open);
  useEffect(() => {
    if (open) { setRendered(true); setClosing(false); was.current = true; return; }
    if (!was.current) return;
    setClosing(true);
    const t = setTimeout(() => { setRendered(false); setClosing(false); was.current = false; }, ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return { rendered, closing };
}
/** Escape stack: the most recently opened surface answers Escape first. */
const stack: { fire: () => void }[] = [];
let bound = false;
function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  const top = stack[stack.length - 1];
  if (top) { e.preventDefault(); e.stopPropagation(); top.fire(); }
}
export function useEscape(fn: () => void, active = true) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => {
    if (!active) return;
    if (!bound) { window.addEventListener('keydown', onKey, true); bound = true; }
    const entry = { fire: () => ref.current() };
    stack.push(entry);
    return () => { const i = stack.indexOf(entry); if (i >= 0) stack.splice(i, 1); };
  }, [active]);
}
export const escapeStackDepth = () => stack.length;
