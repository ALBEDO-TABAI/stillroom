import React from 'react';
// Four quarter-arc grips sitting 3px inside each corner (r 19.5, stroke 3).
const ARCS = [
  { k: 'nw', pos: { top: 3, left: 3 }, d: 'M1.5,21 L1.5,21 A19.5,19.5 0 0,1 21,1.5', cursor: 'nwse-resize' },
  { k: 'ne', pos: { top: 3, right: 3 }, d: 'M19.5,21 L19.5,21 A19.5,19.5 0 0,0 0,1.5', cursor: 'nesw-resize' },
  { k: 'sw', pos: { bottom: 3, left: 3 }, d: 'M1.5,0 L1.5,0 A19.5,19.5 0 0,0 21,19.5', cursor: 'nesw-resize' },
  { k: 'se', pos: { bottom: 3, right: 3 }, d: 'M19.5,0 L19.5,0 A19.5,19.5 0 0,1 0,19.5', cursor: 'nwse-resize' },
] as const;
export type Corner = 'nw' | 'ne' | 'sw' | 'se';
export function Arcs({ onDown }: { onDown: (e: React.PointerEvent, c: Corner) => void }) {
  return <>{ARCS.map(a => (
    <div key={a.k} className="sr-arc" data-arc={a.k} style={{ ...a.pos, cursor: a.cursor }} onPointerDown={e => onDown(e, a.k)}>
      <svg width="21" height="21"><path d={a.d} fill="none" strokeWidth="3" strokeLinecap="round" /></svg>
    </div>))}</>;
}
export function Edges({ inset, onDown }: { inset: number; onDown: (e: React.PointerEvent, side: 'l' | 'r' | 't' | 'b') => void }) {
  return <>
    <div className="sr-edge" style={{ top: inset, bottom: inset, left: -6.5, width: 13, cursor: 'ew-resize' }} onPointerDown={e => onDown(e, 'l')} />
    <div className="sr-edge" style={{ top: inset, bottom: inset, right: -6.5, width: 13, cursor: 'ew-resize' }} onPointerDown={e => onDown(e, 'r')} />
    <div className="sr-edge" style={{ left: inset, right: inset, top: -6.5, height: 13, cursor: 'ns-resize' }} onPointerDown={e => onDown(e, 't')} />
    <div className="sr-edge" style={{ left: inset, right: inset, bottom: -6.5, height: 13, cursor: 'ns-resize' }} onPointerDown={e => onDown(e, 'b')} />
  </>;
}
