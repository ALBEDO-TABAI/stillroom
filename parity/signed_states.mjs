// Signed-in states (same scripts as goldmund-research/cap/signed_states.mjs, our selectors). Prefix u_.
const card = async (p, id) => { const b = await (await p.$(`[data-note-id="${id}"]`)).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
const um = async p => { await p.click('button[aria-label="User menu"]'); await p.waitForTimeout(400); };
export const SIGNED = {
  base: async () => {},
  usermenu: async p => p.click('button[aria-label="User menu"]'),
  handle: async p => p.click('button[data-bc-pill]'),
  search: async p => { await p.click('.sr-search input'); await p.keyboard.type('where', { delay: 40 }); },
  bin: async p => p.click('button[aria-label="Bin"]'),
  bin_center_hover: async p => { await p.click('button[aria-label="Bin"]'); await p.waitForTimeout(500); await p.mouse.move(720, 856); },
  record_hover: async p => p.mouse.move(720, 856),
  usermenu_canvas: async p => { await um(p); await p.getByText('Canvas settings', { exact: true }).click(); },
  usermenu_modules: async p => { await um(p); await p.getByText('Modules settings', { exact: true }).click(); },
  usermenu_usage: async p => { await um(p); await p.getByText('Usage', { exact: true }).click(); },
  ctx_canvas: async p => p.mouse.click(1250, 160, { button: 'right' }),
  hover_link: async p => { const c = await card(p, 'a6'); await p.mouse.move(c.x, Math.min(c.b.y + 40, 880)); },
  hover_folder: async p => { const c = await card(p, 'a2'); await p.mouse.move(c.x, c.y); },
  axis_text: async p => { const c = await card(p, 'a5'); await p.mouse.click(c.x, c.b.y + 30, { button: 'right' }); },
  bin_items: async p => { for (const id of ['a5', 'a2']) { const c = await card(p, id); await p.mouse.click(c.x, c.b.y + 30); await p.keyboard.press('Delete'); await p.waitForTimeout(300); } await p.click('button[aria-label="Bin"]'); await p.waitForTimeout(600); await p.mouse.move(1300, 700); },
  bin_items_axis: async p => { await SIGNED.bin_items(p); await p.click('[data-bin-view] [data-note-id="a5"]', { button: 'right' }); },
  editor: async p => { const c = await card(p, 'a5'); await p.mouse.dblclick(c.x, c.b.y + 30); },
};
export const SIGNED_URL = (base, theme) => `${base}user/stillroom.user?fixture=account&theme=${theme}&gap=3&cam=-1108.53,-268.432,1.29264`;
