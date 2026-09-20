import { expect, test } from '@playwright/test';

async function ready(page: import('@playwright/test').Page) {
  await page.goto('/technical-cards');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0, { timeout: 10_000 });
}

test.describe('Technical Cards explorer', () => {
  test('restores the canonical multi-model state and adapts downstream context selectors', async ({ page }) => {
    await ready(page);
    await expect(page.locator('.model-chip')).toHaveCount(3);
    await expect(page.getByLabel('Execution Regime')).toHaveValue('native_default');
    await page.locator('.model-chip button').last().click();
    await page.getByLabel('Execution Regime').selectOption('single_thread');
    await expect(page.locator('.comparability-banner')).toHaveAttribute('data-status', 'direct');
    await expect(page.locator('[data-technical-card-id]')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Mean latency by batch' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Throughput at selected batch' })).toBeVisible();
    await expect(page).toHaveURL(/regime=single_thread/);
  });

  test('switches to single-model mode when other models are removed', async ({ page }) => {
    await ready(page);
    const removeButtons = page.locator('.model-chip button');
    await removeButtons.nth(2).click();
    await removeButtons.nth(1).click();
    await expect(page.locator('.view-mode strong')).toHaveText('Single model');
    await expect(page.locator('[data-technical-card-id]')).toHaveCount(1);
    await expect(page.locator('.model-chip')).toHaveCount(1);
  });

  test('can remove and add a canonical model without losing a valid context', async ({ page }) => {
    await ready(page);
    const lastName = await page.locator('.model-chip').last().textContent();
    await page.locator('.model-chip button').last().click();
    await expect(page.locator('.model-chip')).toHaveCount(2);
    await page.locator('.add-model summary').click();
    const unchecked = page.locator('.model-options input:not(:checked)');
    await expect(unchecked).toHaveCount(1);
    await unchecked.check();
    await expect(page.locator('.model-chip')).toHaveCount(3);
    await expect(page.locator('.model-chip').last()).toContainText(lastName?.replace('×', '').trim() ?? '');
  });

  test('changes backend and exposes only its valid execution regime', async ({ page }) => {
    await ready(page);
    const backend = page.getByLabel('Device / Backend', { exact: true });
    const mpsValue = await backend.locator('option').filter({ hasText: 'MPS' }).getAttribute('value');
    await backend.selectOption(mpsValue!);
    await expect(page.getByLabel('Execution Regime')).toHaveValue('backend_default');
    await expect(page.getByLabel('Execution Regime').locator('option')).toHaveCount(1);
    await expect(page.locator('[data-technical-card-id]')).toHaveCount(3);
  });

  test('shows partial metric coverage instead of fabricating energy', async ({ page }) => {
    await ready(page);
    await expect(page.locator('.comparability-banner')).toHaveAttribute('data-status', 'partial');
    const energy = page.locator('.metric-card').filter({ hasText: 'Energy' });
    await expect(energy).toContainText('Not mutually available');
    await expect(energy).not.toContainText(/^0(?:\.0+)?$/);
  });

  test('an incompatible empty selection withholds comparative plots', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page.locator('.comparability-banner')).toHaveAttribute('data-status', 'incompatible');
    await expect(page.getByRole('heading', { name: 'Comparative plots withheld' })).toBeVisible();
    await expect(page.locator('.runtime-plots')).toHaveCount(0);
  });

  test('restores valid URL state and sanitizes stale context values', async ({ page }) => {
    await page.goto('/technical-cards?models=panns-resnet38-map-0434&device=stale&regime=stale&protocol=old%400&batch=999&view=comparison');
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('.model-chip')).toHaveCount(1);
    await expect(page.locator('.view-mode strong')).toHaveText('Single model');
    await expect(page.getByLabel('Batch Size', { exact: true })).toHaveValue('1');
    await expect(page).not.toHaveURL(/device=stale/);
  });

  test('keeps theme controls functional and returns to Model Cards', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: /Night/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
    await page.getByRole('link', { name: 'torch-dae Model Cards' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
