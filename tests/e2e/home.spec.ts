import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { CatalogueIndex } from '../../src/data/types/catalogue';
import { waitForVisualStability } from './helpers/visual-stability';

const catalogueUrl = new URL('../../src/generated/catalogue.json', import.meta.url);
const catalogue: CatalogueIndex = JSON.parse(readFileSync(fileURLToPath(catalogueUrl), 'utf8'));

const modelNames = catalogue.models.map((model) => model.displayName);
const FORBIDDEN_MOCKUP_NAMES = [
  'PANNs ResNet38 16 kHz (Enhanced)',
  'PANNs Wavegram-Logmel CNN14',
  'PANNs MobileNet',
  'PANNs CQT CNN14',
];
const FORBIDDEN_QUALITATIVE_BADGES = ['Popular', 'State-of-the-art', 'Research Grade', 'Production Ready', 'Best'];

/** React islands hydrate asynchronously; interaction tests must wait past the SSR marker. */
async function waitForHydration(page: import('@playwright/test').Page) {
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
}

test.describe('Model Cards homepage', () => {
  test('renders exactly the canonical models and no mockup-only fictional models', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-model-id]')).toHaveCount(catalogue.models.length);
    for (const name of modelNames) {
      await expect(page.getByRole('heading', { name, exact: true }).first()).toBeVisible();
    }
    const bodyText = await page.locator('body').innerText();
    for (const fictional of FORBIDDEN_MOCKUP_NAMES) {
      expect(bodyText).not.toContain(fictional);
    }
  });

  test('never displays unsupported qualitative marketing badges', async ({ page }) => {
    await page.goto('/');
    const bodyText = await page.locator('body').innerText();
    for (const badge of FORBIDDEN_QUALITATIVE_BADGES) {
      expect(bodyText).not.toContain(badge);
    }
  });

  test('clicking a side card selects it and expands its detail in place', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const secondModelId = catalogue.models[1]!.id;
    await page.locator(`[data-model-id="${secondModelId}"] .model-card-select-overlay`).click();
    await expect(page.locator(`[data-model-id="${secondModelId}"][data-selected="true"]`)).toBeVisible();
    await expect(page.locator(`[data-model-id="${secondModelId}"] .model-card-expanded`)).toBeVisible();
  });

  test('a non-selected card exposes exactly one focusable, labeled select control with a visible focus ring', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForHydration(page);
    const secondModelId = catalogue.models[1]!.id;
    const card = page.locator(`[data-model-id="${secondModelId}"]`);

    // Valid HTML: the card surface itself is not a <button>, but there is exactly one accessible
    // "Select <model>" control identifying the model for assistive technology.
    const select = page.getByRole('button', { name: `Select ${catalogue.models[1]!.displayName}` });
    await expect(select).toHaveCount(1);

    await select.focus();
    const outlineWidth = await select.evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(outlineWidth).not.toBe('0px');
    await expect(card).toBeVisible();
  });

  test('ArrowRight/ArrowLeft keyboard navigation moves the selection', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const firstModelId = catalogue.models[0]!.id;
    await expect(page.locator(`[data-model-id="${firstModelId}"][data-selected="true"]`)).toBeVisible();

    await page.locator('.carousel-track').focus();
    await page.keyboard.press('ArrowRight');
    const secondModelId = catalogue.models[1]!.id;
    await expect(page.locator(`[data-model-id="${secondModelId}"][data-selected="true"]`)).toBeVisible();

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator(`[data-model-id="${firstModelId}"][data-selected="true"]`)).toBeVisible();
  });

  test('ArrowLeft/ArrowRight while an inner interactive control is focused does not change the selection', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForHydration(page);
    const firstModelId = catalogue.models[0]!.id;
    await expect(page.locator(`[data-model-id="${firstModelId}"][data-selected="true"]`)).toBeVisible();

    // The reference-context <summary> lives inside the selected (expanded) card, not the track itself.
    const innerControl = page.locator('.performance-context > summary');
    await innerControl.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');

    await expect(page.locator(`[data-model-id="${firstModelId}"][data-selected="true"]`)).toBeVisible();
  });

  test('pagination dots select a model directly', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const thirdModelId = catalogue.models[2]!.id;
    await page.getByRole('button', { name: `Show ${catalogue.models[2]!.displayName}` }).click();
    await expect(page.locator(`[data-model-id="${thirdModelId}"][data-selected="true"]`)).toBeVisible();
  });

  test('theme toggle persists across reload', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    await page.getByRole('button', { name: /Night/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  });

  test('external navbar links point to the correct destinations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/StefanoGiacomelli/torch_dae',
    );
    await expect(page.getByRole('link', { name: /Documentation/ })).toHaveAttribute(
      'href',
      'https://torch-dae.readthedocs.io/en/latest/',
    );
    await expect(page.getByRole('link', { name: /PyPI/ })).toHaveAttribute(
      'href',
      'https://pypi.org/project/torch-deepaudioembedding/',
    );
    await expect(page.getByRole('link', { name: 'Technical Cards' })).toHaveAttribute('href', '/technical-cards/');
  });

  test('runtime verification preserves locally-verified vs upstream-declared semantics', async ({ page }) => {
    await page.goto('/');
    const selected = page.locator('[data-selected="true"]');
    await expect(selected.locator('li[data-status="locally_verified"]').first()).toBeVisible();
    await expect(selected.locator('li[data-status="upstream_declared"]').first()).toContainText(
      'upstream-declared, locally unverified',
    );
  });

  test('the reference runtime context is discoverable without hover, via keyboard', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const trigger = page.locator('.performance-context > summary');
    await expect(trigger).toBeVisible();
    await trigger.focus();
    await page.keyboard.press('Enter');
    const detail = page.locator('.performance-context-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('CPU');
    await expect(detail).toContainText(/batch size/i);
    await expect(detail).toContainText('audio-inference-v1');
  });

  test('missing/partial energy is never rendered as a fabricated zero value', async ({ page }) => {
    await page.goto('/');
    // panns-cnn14-16k-map-0438 is the first canonical model and is selected by default.
    const cnn14 = catalogue.models.find((model) => model.id === 'panns-cnn14-16k-map-0438')!;
    await expect(page.locator(`[data-model-id="${cnn14.id}"][data-selected="true"]`)).toBeVisible();
    const energyRow = page.locator(`[data-model-id="${cnn14.id}"] .metric-row`).filter({ hasText: 'Energy' });
    await expect(energyRow).not.toContainText('0 J');
    await expect(energyRow).not.toContainText('0.0 J');
  });

  test('footer states the actual canonical license, never a fabricated one', async ({ page }) => {
    await page.goto('/');
    expect(catalogue.metadata.licenseIdentifier).toBe('Apache-2.0');
    const footerText = await page.locator('.home-footer').innerText();
    expect(footerText).toContain('Apache-2.0-licensed torch-dae');
    expect(footerText).not.toContain('MIT');
    expect(footerText).not.toContain('no lock-in');
  });

  test('desktop viewports have no document-level vertical scrollbar', async ({ page }) => {
    for (const viewport of [
      { width: 1512, height: 827 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await waitForVisualStability(page);
      const { scrollHeight, clientHeight } = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: window.innerHeight,
      }));
      expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 2);
    }
  });

  test('at 1366x768 the complete Runtime verification block is visible in the expanded card without scrolling the detail column', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await waitForHydration(page);
    await waitForVisualStability(page, '.model-card[data-selected="true"]');
    const container = page.locator('.model-card[data-selected="true"] .model-card-columns');
    const verification = page.locator('.model-card[data-selected="true"] .runtime-verification');
    await expect(verification).toBeVisible();
    // Every backend row (not just the section heading) must be within the initially visible
    // viewport of the scrollable detail column — no partial clipping of the last row.
    const rows = verification.locator('li');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    const containerBox = await container.boundingBox();
    for (let index = 0; index < rowCount; index += 1) {
      const rowBox = await rows.nth(index).boundingBox();
      expect(rowBox).not.toBeNull();
      expect(containerBox).not.toBeNull();
      expect(rowBox!.y + rowBox!.height).toBeLessThanOrEqual(containerBox!.y + containerBox!.height + 1);
    }
    // The complete Performance Profile (all 4 metric rows) must also be initially visible.
    const metricRows = page.locator('.model-card[data-selected="true"] .metric-row');
    const metricCount = await metricRows.count();
    expect(metricCount).toBe(4);
    for (let index = 0; index < metricCount; index += 1) {
      const rowBox = await metricRows.nth(index).boundingBox();
      expect(rowBox).not.toBeNull();
      expect(rowBox!.y + rowBox!.height).toBeLessThanOrEqual(containerBox!.y + containerBox!.height + 1);
    }
  });
});
