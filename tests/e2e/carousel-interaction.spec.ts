import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { CatalogueIndex } from '../../src/data/types/catalogue';

const catalogueUrl = new URL('../../src/generated/catalogue.json', import.meta.url);
const catalogue: CatalogueIndex = JSON.parse(readFileSync(fileURLToPath(catalogueUrl), 'utf8'));

async function waitForHydration(page: import('@playwright/test').Page) {
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
}

function selectedModelId(page: import('@playwright/test').Page) {
  return page.locator('[data-selected="true"]').getAttribute('data-model-id');
}

test.describe('Carousel pointer/wheel interaction hardening', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 827 });
    await page.goto('/');
    await waitForHydration(page);
  });

  test('a horizontal pointer drag changes the selection exactly once, in the expected direction', async ({
    page,
  }) => {
    const before = await selectedModelId(page);
    const box = (await page.locator('.carousel-track').boundingBox())!;
    const startX = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await page.mouse.move(startX, y);
    await page.mouse.down();
    // Drag well past the navigation threshold in a single deliberate motion.
    await page.mouse.move(startX - 220, y, { steps: 12 });
    await page.mouse.up();

    const after = await selectedModelId(page);
    expect(after).not.toBe(before);
    const beforeIndex = catalogue.models.findIndex((m) => m.id === before);
    const afterIndex = catalogue.models.findIndex((m) => m.id === after);
    const total = catalogue.models.length;
    expect(((afterIndex - beforeIndex) % total + total) % total).toBe(1);

    // Exactly one step: a further identical drag should move exactly one more step, not two.
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(startX - 220, y, { steps: 12 });
    await page.mouse.up();
    const finalId = await selectedModelId(page);
    const finalIndex = catalogue.models.findIndex((m) => m.id === finalId);
    expect(((finalIndex - afterIndex) % total + total) % total).toBe(1);
  });

  test('a completed drag over a side card does not also trigger that card click and override the drag result', async ({
    page,
  }) => {
    const before = await selectedModelId(page);
    const sideCard = page.locator('[data-offset="1"]');
    const box = (await sideCard.boundingBox())!;
    const startX = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    // Drag starting directly on the right side card's own surface, ending far to the left: if the
    // trailing click were not suppressed, the side card's own onClick would select IT (offset +1),
    // fighting with the drag's own navigation outcome.
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(startX - 300, y, { steps: 15 });
    await page.mouse.up();

    const after = await selectedModelId(page);
    const total = catalogue.models.length;
    const beforeIndex = catalogue.models.findIndex((m) => m.id === before);
    const afterIndex = catalogue.models.findIndex((m) => m.id === after);
    // The drag (leftward) must move selection forward by exactly one, matching the drag direction —
    // not to the card that was physically under the pointer at drag start.
    expect(((afterIndex - beforeIndex) % total + total) % total).toBe(1);
  });

  test('an ordinary (non-drag) click still selects the clicked side card', async ({ page }) => {
    const secondModelId = catalogue.models[1]!.id;
    await page.locator(`[data-model-id="${secondModelId}"] .model-card-select-overlay`).click();
    await expect(page.locator(`[data-model-id="${secondModelId}"][data-selected="true"]`)).toBeVisible();
  });

  test('a horizontal wheel/trackpad deltaX gesture changes the selection according to policy', async ({ page }) => {
    const before = await selectedModelId(page);
    const box = (await page.locator('.carousel-track').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(80, 0);
    await page.waitForTimeout(50);

    const after = await selectedModelId(page);
    expect(after).not.toBe(before);
    const total = catalogue.models.length;
    const beforeIndex = catalogue.models.findIndex((m) => m.id === before);
    const afterIndex = catalogue.models.findIndex((m) => m.id === after);
    // Positive deltaX (content should move left, revealing the next item) advances the selection.
    expect(((afterIndex - beforeIndex) % total + total) % total).toBe(1);
  });
});
