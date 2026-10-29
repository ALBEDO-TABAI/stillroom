// Stillroom icon set: 16-unit grid, 1.2 stroke, drawn at 20px (16 for chevrons).
import React from 'react';
const P: Record<string, React.ReactNode> = {
  user: <><circle cx="8" cy="5.5" r="2.5" /><path d="M3 13.6c.6-2.6 2.6-4 5-4s4.4 1.4 5 4" /></>,
  sun: <><circle cx="8" cy="8" r="3" /><path d="M8 1.6v1.3M8 13.1v1.3M1.6 8h1.3M13.1 8h1.3M3.5 3.5l.9.9M11.6 11.6l.9.9M3.5 12.5l.9-.9M11.6 4.4l.9-.9" /></>,
  moon: <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" />,
  search: <><circle cx="7" cy="7" r="4.2" /><path d="M10.2 10.2l3.3 3.3" /></>,
  trash: <><path d="M2.5 4.2h11" /><path d="M12.3 4.2v8.9c0 .8-.6 1.4-1.4 1.4H5.1c-.8 0-1.4-.6-1.4-1.4V4.2" /><path d="M5.8 4.2V2.9c0-.6.5-1.1 1.1-1.1h2.2c.6 0 1.1.5 1.1 1.1v1.3" /></>,
  info: <><circle cx="8" cy="3.6" r=".9" fill="currentColor" stroke="none" /><path d="M8 6.8v6" /></>,
  share: <><path d="M4.5 11.5l7-7" /><path d="M6 4.5h5.5V10" /></>,
  download: <><path d="M2.5 4h8.5M2.5 7h8.5M2.5 10h4.6" /><path d="M11.8 8.6v4.6M9.9 11.4l1.9 1.9 1.9-1.9" /></>,
  text: <><path d="M3 4.5h10M3 8h10M3 11.5h6" /></>,
  folder: <path d="M2 4.6c0-.8.6-1.4 1.4-1.4h2.7l1.4 1.5h5.1c.8 0 1.4.6 1.4 1.4v5.4c0 .8-.6 1.4-1.4 1.4H3.4c-.8 0-1.4-.6-1.4-1.4Z" />,
  link: <><path d="M6.6 9.4l2.8-2.8" /><path d="M7.3 4.6l1-1a2.6 2.6 0 0 1 3.7 3.7l-1 1" /><path d="M8.7 11.4l-1 1A2.6 2.6 0 0 1 4 8.7l1-1" /></>,
  camera: <><path d="M2.2 5.6c0-.7.6-1.3 1.3-1.3h1.6l1-1.4h3.8l1 1.4h1.6c.7 0 1.3.6 1.3 1.3v6c0 .7-.6 1.3-1.3 1.3H3.5c-.7 0-1.3-.6-1.3-1.3Z" /><circle cx="8" cy="8.4" r="2.2" /></>,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  expand: <><path d="M2.8 6V3.6c0-.4.4-.8.8-.8H6M10 2.8h2.4c.4 0 .8.4.8.8V6M13.2 10v2.4c0 .4-.4.8-.8.8H10M6 13.2H3.6c-.4 0-.8-.4-.8-.8V10" /></>,
  collapse: <><path d="M6 2.8v2.4c0 .4-.4.8-.8.8H2.8M13.2 6h-2.4c-.4 0-.8-.4-.8-.8V2.8M10 13.2v-2.4c0-.4.4-.8.8-.8h2.4M2.8 10h2.4c.4 0 .8.4.8.8v2.4" /></>,
  play: <path d="M5.2 3.4v9.2c0 .4.4.6.7.4l7-4.6c.3-.2.3-.6 0-.8l-7-4.6c-.3-.2-.7 0-.7.4Z" fill="currentColor" stroke="none" />,
  pause: <><rect x="4" y="3.2" width="2.6" height="9.6" rx=".8" fill="currentColor" stroke="none" /><rect x="9.4" y="3.2" width="2.6" height="9.6" rx=".8" fill="currentColor" stroke="none" /></>,
  chevron: <path d="M6.2 3.6L10.6 8l-4.4 4.4" />,
  chevronDown: <path d="M4 6.4l4 4 4-4" />,
  heading: <><path d="M3 3.5v9M9 3.5v9M3 8h6" /><path d="M11.4 7.2l1.6-1v6.3" /></>,
  list: <><circle cx="3.3" cy="4.5" r=".7" fill="currentColor" stroke="none" /><circle cx="3.3" cy="8" r=".7" fill="currentColor" stroke="none" /><circle cx="3.3" cy="11.5" r=".7" fill="currentColor" stroke="none" /><path d="M6 4.5h7.5M6 8h7.5M6 11.5h7.5" /></>,
  weight: <path d="M4 13L8 3l4 10M5.6 9.2h4.8" />,
  align: <path d="M2.5 4h11M2.5 8h7.5M2.5 12h11" />,
  alignCenter: <path d="M2.5 4h11M4.5 8h7M2.5 12h11" />,
  alignRight: <path d="M2.5 4h11M6 8h7.5M2.5 12h11" />,
  more: <><circle cx="3.5" cy="8" r=".9" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none" /><circle cx="12.5" cy="8" r=".9" fill="currentColor" stroke="none" /></>,
  panel: <><rect x="2.5" y="3" width="11" height="10" rx="2" /><path d="M6.5 6v4" /></>,
  mic: <><rect x="6" y="2" width="4" height="7.5" rx="2" /><path d="M3.8 8a4.2 4.2 0 0 0 8.4 0M8 12.2v1.8" /></>,
  video: <><rect x="2" y="4" width="8.6" height="8" rx="1.6" /><path d="M10.6 7l3.4-2v6l-3.4-2" /></>,
  arrowLeft: <path d="M9.8 3.6L5.4 8l4.4 4.4" />,
  arrowRight: <path d="M6.2 3.6L10.6 8l-4.4 4.4" />,
  restore: <><path d="M3.2 7.6a4.8 4.8 0 1 1 1.4 3.6" /><path d="M3 4.2v3.4h3.4" /></>,
  bold: <path d="M4.5 3h4a2.4 2.4 0 0 1 0 4.8h-4zM4.5 7.8h4.6a2.6 2.6 0 0 1 0 5.2H4.5z" />,
  italic: <path d="M9.6 3H7M9 13H6.4M9 3L7 13" />,
  check: <path d="M3.4 8.4l3 3 6.2-6.6" />,
};
export function Icon({ name, size = 20, sw = 1.2, style }: { name: string; size?: number; sw?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: 'block', flexShrink: 0, ...style }}>
      {P[name] ?? null}
    </svg>
  );
}
