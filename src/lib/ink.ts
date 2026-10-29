export const ACCENT = '#FFA000';
export const DESTRUCTIVE = '#FF3B30';
export function ink(dark: boolean) {
  return {
    text: dark ? '#F0F0F0' : '#111111',
    muted: dark ? '#8E8E93' : '#6D6D72',
    faint: dark ? '#7C7C7E' : '#AEAEB2',
    marker: 'rgba(127,127,127,0.7)',
    card: dark ? '#141414' : '#FFFFFF',
    cardInk: dark ? '#F5F5F5' : '#212121',
    canvas: dark ? '#000000' : '#E5E5EA',
    accent: ACCENT,
    destructive: DESTRUCTIVE,
  };
}
export function glass(dark: boolean, on = false): React.CSSProperties {
  return {
    background: dark ? (on ? 'rgba(58,58,62,0.62)' : 'rgba(44,44,46,0.60)') : (on ? 'rgba(200,200,206,0.72)' : 'rgba(218,218,222,0.70)'),
    backdropFilter: 'blur(30px) saturate(160%)',
    WebkitBackdropFilter: 'blur(30px) saturate(160%)',
  };
}
