import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const outputDirectory = resolve(process.argv[2] ?? 'screenshots');
const baseURL = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:4321';
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 827 }, deviceScaleFactor: 1 });

for (const [route, stem] of [['/', 'home-skeleton'], ['/technical-cards', 'technical-skeleton']]) {
  for (const theme of ['day', 'night']) {
    await page.addInitScript((selectedTheme) => localStorage.setItem('torch-dae-theme', selectedTheme), theme);
    await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    const label = theme === 'day' ? 'light' : 'night';
    await page.screenshot({ path: resolve(outputDirectory, `${stem}-${label}.png`), fullPage: false });
  }
}

await browser.close();
