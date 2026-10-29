import React, { useRef } from 'react';
import { useStore, liveIds } from '../store/store';
import { Icon } from '../lib/icons';
import { from, useEscape } from '../lib/motion';
import { clearLocal } from '../store/persist';
import { fmtBytes } from '../lib/time';

const Toggle = ({ on }: { on: boolean }) => <span className="sr-toggle" data-on={on ? 'true' : undefined}><span /></span>;

function Slider({ label, value, min, max, onChange, off }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; off?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const set = (x: number) => {
    const r = ref.current!.getBoundingClientRect();
    onChange(Math.round(min + Math.max(0, Math.min(1, (x - r.left) / r.width)) * (max - min)));
  };
  const p = (value - min) / (max - min) * 100;
  return (
    <div className="sr-slider-row" data-off={off ? 'true' : undefined}>
      <span>{label}</span>
      <div ref={ref} className="sr-slider" role="slider" aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} aria-label={label} tabIndex={0}
        onKeyDown={e => { if (e.key === 'ArrowRight') onChange(Math.min(max, value + 1)); if (e.key === 'ArrowLeft') onChange(Math.max(min, value - 1)); }}
        onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); set(e.clientX); }}
        onPointerMove={e => { if (e.buttons) set(e.clientX); }}>
        <i /><b style={{ left: `${p}%` }} />
      </div>
      <span className="v">{value}</span>
    </div>
  );
}

function Section({ id, label, children }: { id: 'canvas' | 'modules' | 'usage'; label: string; children: React.ReactNode }) {
  const open = useStore(s => s.ui.userSection === id);
  const setUI = useStore(s => s.setUI);
  return (
    <>
      <button type="button" className="sr-row" onClick={() => setUI({ userSection: open ? null : id, shortcuts: false })}>
        <span>{label}</span><span className="sr-chev" style={{ transform: `rotate(${open ? 90 : 0}deg)` }}><Icon name="chevron" size={16} /></span>
      </button>
      <div className="sr-collapse" data-open={open ? 'true' : undefined}><div><div className="sr-sub">{children}</div></div></div>
    </>
  );
}

export function UserMenu() {
  const p = useStore(s => s.prefs);
  const setPrefs = useStore(s => s.setPrefs);
  const setUI = useStore(s => s.setUI);
  const shortcuts = useStore(s => s.ui.shortcuts);
  const stats = useStore(s => {
    const all = Object.values(s.notes).filter(n => !n.deletedAt);
    const voice = all.filter(n => n.type === 'audio').reduce((a, n) => { const [m, sec] = (n.duration ?? '0:00').split(':').map(Number); return a + m * 60 + sec; }, 0);
    const pics = all.filter(n => n.type === 'image').reduce((a, n) => a + (n.metadata.fileSize ?? 0), 0);
    return `${Math.ceil(voice / 60)} min / 30 min|${(pics / 1e6).toFixed(1)} MB / 500 MB|${all.length} / 1 000`;
  }).split('|');
  useEscape(() => setUI({ userMenu: false, shortcuts: false }));
  const row = (label: string, on: boolean, f: () => void, indent = 16) => (
    <button type="button" className="sr-row" style={{ paddingLeft: indent }} onClick={f}><span>{label}</span><Toggle on={on} /></button>
  );
  return (
    <>
      <div className="sr-panel sr-user-panel sr-in" style={from({ y: -10, s: 0.96 })} data-keep-menu-open="true" onPointerDown={e => e.stopPropagation()}>
        <Section id="canvas" label="Canvas settings">
          {row('Smart guides', p.smartGuides, () => setPrefs({ smartGuides: !p.smartGuides }))}
          {row('Magnetic snap', p.magneticSnap, () => setPrefs({ magneticSnap: !p.magneticSnap }))}
          <Slider label="Gap" value={p.gap} min={0} max={12} onChange={v => setPrefs({ gap: v })} off={!p.magneticSnap} />
          <Slider label="Radius" value={p.snapRadius} min={24} max={64} onChange={v => setPrefs({ snapRadius: v })} off={!p.magneticSnap} />
          {row('Adaptive scale', p.adaptiveScale, () => setPrefs({ adaptiveScale: !p.adaptiveScale }), 30)}
          {row('Transcribe on drop', p.autoTranscribe, () => setPrefs({ autoTranscribe: !p.autoTranscribe }))}
        </Section>
        <Section id="modules" label="Modules settings">
          {row('Rounded corners', p.imageRounded, () => setPrefs({ imageRounded: !p.imageRounded }))}
        </Section>
        <Section id="usage" label="Usage">
          {[['Voice this month', stats[0]], ['Pictures', stats[1]], ['Modules', stats[2]]].map(([k, v]) => (
            <div key={k} className="sr-row" aria-disabled="true" style={{ paddingLeft: 16, cursor: 'default' }}><span>{k}</span><span className="sr-stat">{v}</span></div>
          ))}
        </Section>
        <button type="button" className={'sr-row' + (shortcuts ? ' is-on' : '')} onClick={() => setUI({ shortcuts: !shortcuts })}>
          <span>Shortcuts</span><span className="sr-chev"><Icon name="chevron" size={16} /></span>
        </button>
        <button type="button" className="sr-row" onClick={() => setPrefs({ storeLocally: !p.storeLocally })}>
          <span>Store locally</span><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Toggle on={p.storeLocally} /></span>
        </button>
        <div style={{ height: 8 }} />
        <button type="button" className="sr-row" onClick={() => { setUI({ userMenu: false }); location.hash = '#/welcome'; }}><span>Sign out</span></button>
        <button type="button" className="sr-row sr-btn--quiet sr-btn--dstr" onClick={() => {
          if (confirm('Delete everything on this device? This clears the local canvas.')) { clearLocal(); indexedDB.deleteDatabase('stillroom-media'); location.reload(); }
        }}><span>Delete account</span></button>
      </div>
      {shortcuts && <Shortcuts />}
    </>
  );
}

export const SHORTCUTS: [string, [string, string][]][] = [
  ['Canvas', [['New module or folder', 'right-click / 2-finger tap'], ['Pan the canvas', 'middle-click / 2-finger scroll'], ['Zoom in / out', 'scroll / pinch / + −'], ['Reset view', 'H'], ['Search', '⌘ F'], ['Focus mode', 'F']]],
  ['Modules', [['Edit mode', 'double-click'], ['Axis menu', 'right-click on module'], ['Center on selected', 'C'], ['Move without snap', '⇧ drag'], ['One layer up / down', '] / ['], ['Bring to front', '⇧ ] · shake ⇅ while dragging'], ['Send to back', '⇧ [ · shake ⇄ while dragging']]],
  ['Layout', [['Gallery layout', 'P'], ['Organic layout', 'L'], ['Scatter', 'R']]],
  ['Image modules', [['Crop', '⌥ hover'], ['Rotate 90°', '⇧ drag corner arc'], ['Slideshow', 'Enter / double-click']]],
];

function Shortcuts() {
  return (
    <div className="sr-panel sr-user-panel sr-shortcuts sr-in" style={from({ x: -8 })} onPointerDown={e => e.stopPropagation()}>
      {SHORTCUTS.map(([h, rows]) => (
        <React.Fragment key={h}>
          <h6>{h}</h6>
          {rows.map(([k, v]) => <React.Fragment key={k}><div className="k">{k}</div><div className="v">{v}</div></React.Fragment>)}
        </React.Fragment>
      ))}
    </div>
  );
}
