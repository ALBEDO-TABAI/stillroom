import { chromium } from 'playwright';
const [url, out, w = 1440, h = 900] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome' });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector(process.env.SEL || '[data-card]'); await p.waitForTimeout(1500);
if (process.env.ACT) await eval(process.env.ACT);
await p.screenshot({ path: out }); await b.close();
