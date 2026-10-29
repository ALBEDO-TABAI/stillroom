import React from 'react';
import { useStore } from '../store/store';
import { Icon } from '../lib/icons';
import { btn } from '../lib/button';

/** The Bin button toggles bin mode (it stays on until pressed again, like the reference). */
export function Bin({ hidden }: { hidden?: boolean }) {
  const open = useStore(s => s.ui.binOpen);
  const focus = useStore(s => s.ui.focus);
  const setUI = useStore(s => s.setUI);
  return (
    <div className="sr-bin" style={{ transform: focus ? 'translateY(80px)' : 'none', display: hidden ? 'none' : undefined }}>
      <button aria-label="Bin" title="Bin" aria-pressed={open} className={btn({ icon: true, quiet: true, on: open })}
        onClick={() => { useStore.getState().select([]); setUI({ binOpen: !open, search: '', menu: null }); }}>
        <Icon name="trash" />
      </button>
    </div>
  );
}
