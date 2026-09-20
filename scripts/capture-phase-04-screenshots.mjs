import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const outputDirectory = resolve(process.argv[2] ?? 'screenshots');
const baseURL = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:4321';
const catalogue = JSON.parse(await readFile(resolve('src/generated/catalogue.json'), 'utf8'));
const modelIds = catalogue.models.map((model) => model.id);
const directModelIds = modelIds.filter((id) => !id.includes('wavegram'));
const cpuCard = catalogue.technicalCards.find((card) => card.context.deviceBackend === 'cpu');
if (!cpuCard) throw new Error('No canonical CPU Technical Card is available');
const device = `cpu:${cpuCard.context.environment.hardwareFingerprint}`;
const protocol = `${cpuCard.context.protocolId}@${cpuCard.context.protocolVersion}`;
const single = catalogue.models.find((model) => model.id.includes('resnet')) ?? catalogue.models[0];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();

async function newPage(theme, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.addInitScript((selectedTheme) => localStorage.setItem('torch-dae-theme', selectedTheme), theme);
  return page;
}

async function captureHome(name, theme, viewport, { expandSecondCard } = {}) {
  const page = await newPage(theme, viewport);
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  await page.locator('astro-island[ssr]').waitFor({ state: 'detached' });
  if (expandSecondCard) {
    await page.getByRole('button', { name: 'Next model' }).click();
    await page.waitForTimeout(350);
  }
  await page.screenshot({ path: resolve(outputDirectory, name), fullPage: false });
  await page.close();
}

async function captureTechnical(name, theme, viewport, query) {
  const page = await newPage(theme, viewport);
  const search = query ? `?${new URLSearchParams(query)}` : '';
  await page.goto(`${baseURL}/technical-cards${search}`, { waitUntil: 'networkidle' });
  await page.locator('astro-island[ssr]').waitFor({ state: 'detached' });
  await page.screenshot({ path: resolve(outputDirectory, name), fullPage: false });
  await page.close();
}

const FLAGSHIP = { width: 1512, height: 827 };
const directQuery = {
  models: directModelIds.join(','), device, regime: 'single_thread', protocol, batch: '1', view: 'comparison',
};
const singleQuery = {
  models: single.id, device, regime: 'native_default', protocol, batch: '1', view: 'single',
};
const partialQuery = {
  models: modelIds.join(','), device, regime: 'native_default', protocol, batch: '1', view: 'comparison',
};

// Flagship 1512x827 required set.
await captureHome('home-light.png', 'day', FLAGSHIP);
await captureHome('home-night.png', 'night', FLAGSHIP);
await captureHome('home-light-expanded.png', 'day', FLAGSHIP, { expandSecondCard: true });
await captureHome('home-night-expanded.png', 'night', FLAGSHIP, { expandSecondCard: true });
await captureTechnical('technical-light-direct-comparison.png', 'day', FLAGSHIP, directQuery);
await captureTechnical('technical-night-direct-comparison.png', 'night', FLAGSHIP, directQuery);
await captureTechnical('technical-light-single.png', 'day', FLAGSHIP, singleQuery);
await captureTechnical('technical-night-single.png', 'night', FLAGSHIP, singleQuery);
await captureTechnical('technical-incompatible-or-partial.png', 'night', FLAGSHIP, partialQuery);

// Additional required viewports (both pages, night theme).
for (const [label, viewport] of [
  ['1366x768', { width: 1366, height: 768 }],
  ['1024x768', { width: 1024, height: 768 }],
  ['390x844', { width: 390, height: 844 }],
]) {
  await captureHome(`home-${label}.png`, 'night', viewport);
  await captureTechnical(`technical-${label}.png`, 'night', viewport, directQuery);
}

await browser.close();
console.log(`Screenshots written to ${outputDirectory}`);
