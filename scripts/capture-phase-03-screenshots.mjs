import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const outputDirectory = resolve(process.argv[2] ?? 'screenshots');
const baseURL = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:4321';
const catalogue = JSON.parse(await readFile(resolve('src/generated/catalogue.json'), 'utf8'));
const modelIds = catalogue.models.map((model) => model.id);
const cpuCard = catalogue.technicalCards.find((card) => card.context.deviceBackend === 'cpu');
if (!cpuCard) throw new Error('No canonical CPU Technical Card is available');
const device = `cpu:${cpuCard.context.environment.hardwareFingerprint}`;
const protocol = `${cpuCard.context.protocolId}@${cpuCard.context.protocolVersion}`;
const resnet = catalogue.models.find((model) => model.id.includes('resnet')) ?? catalogue.models[0];
const directModelIds = modelIds.filter((id) => !id.includes('wavegram'));

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();

async function capture(name, theme, modelSelection, regime) {
  const page = await browser.newPage({ viewport: { width: 1512, height: 827 }, deviceScaleFactor: 1 });
  await page.addInitScript((selectedTheme) => localStorage.setItem('torch-dae-theme', selectedTheme), theme);
  const query = new URLSearchParams({
    models: modelSelection.join(','), device, regime, protocol, batch: '1',
    view: modelSelection.length === 1 ? 'single' : 'comparison',
  });
  await page.goto(`${baseURL}/technical-cards?${query}`, { waitUntil: 'networkidle' });
  await page.locator('astro-island[ssr]').waitFor({ state: 'detached' });
  await page.screenshot({ path: resolve(outputDirectory, name), fullPage: false });
  await page.close();
}

await capture('technical-single-light.png', 'day', [resnet.id], 'native_default');
await capture('technical-single-night.png', 'night', [resnet.id], 'native_default');
await capture('technical-multi-direct-light.png', 'day', directModelIds, 'single_thread');
await capture('technical-multi-direct-night.png', 'night', directModelIds, 'single_thread');
await capture('technical-partial-or-incompatible.png', 'night', modelIds, 'native_default');

await browser.close();
