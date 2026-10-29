export type BtnOpts = { row?: boolean; icon?: boolean; surface?: 'glass' | 'solid' | 'ghost' | 'accent'; quiet?: boolean; on?: boolean; destructive?: boolean; wide?: boolean };
export function btn(o: BtnOpts = {}) {
  const c = [o.row ? 'sr-row' : 'sr-btn'];
  if (o.icon) c.push('sr-btn--icon');
  if (o.surface && o.surface !== 'glass') c.push('sr-btn--' + o.surface);
  if (o.quiet) c.push('sr-btn--quiet');
  if (o.on) c.push('is-on');
  if (o.destructive) c.push('sr-btn--dstr');
  if (o.wide) c.push('sr-btn--wide');
  return c.join(' ');
}
