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

  test('shows a distinct, legible energy availability state instead of fabricating a value', async ({ page }) => {
    await ready(page);
    await expect(page.locator('.comparability-banner')).toHaveAttribute('data-status', 'partial');
    const energy = page.locator('.metric-card').filter({ hasText: 'Energy' });
    await expect(energy).toHaveAttribute('data-energy-state', 'partial');
    await expect(energy.locator('.energy-state-chip')).toHaveText('Partial coverage');
    await expect(energy).not.toContainText(/^0(?:\.0+)?$/);
    // The per-model reason is a native accessible disclosure, not a hover-only tooltip.
    await energy.getByText('Why not comparable').click();
    await expect(energy).toContainText('partial');
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

  test('renders the default latency/throughput/radar overview for a direct multi-model comparison, with RTF/speed/memory/energy available as opt-in plots and no chart-workspace scrollbar', async ({ page }) => {
    await ready(page);
    await page.locator('.model-chip button').last().click();
    await page.getByLabel('Execution Regime').selectOption('single_thread');
    await expect(page.locator('.comparability-banner')).toHaveAttribute('data-status', 'direct');
    await expect(page.getByRole('heading', { name: 'Mean latency by batch' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Throughput at selected batch' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Normalized Multi-Metric Comparison' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Real-time factor by batch' })).toHaveCount(0);
    // The "chart workspace fits" requirement is verified at both the flagship 1512x827 viewport
    // and 1366x768.
    const runtimePlots = page.locator('.runtime-plots');
    for (const viewport of [{ width: 1512, height: 827 }, { width: 1366, height: 768 }]) {
      await page.setViewportSize(viewport);
      await expect(async () => {
        const overflow = await runtimePlots.evaluate((el) => el.scrollHeight - el.clientHeight);
        expect(overflow).toBeLessThanOrEqual(1);
      }).toPass();
    }
    await expect(page.locator('.radar-card svg circle')).not.toHaveCount(0);
    await expect(page.locator('.radar-legend li')).toHaveCount(2);

    await page.getByRole('button', { name: 'RTF', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Real-time factor by batch' })).toBeVisible();
    await page.getByRole('button', { name: 'Memory', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'RSS sampled peak' })).toBeVisible();
    await page.getByRole('button', { name: 'Energy', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Profile energy' })).toBeVisible();
  });

  test('the default initial 3-model partial state has no chart-workspace scrollbar at 1512x827 or 1366x768', async ({ page }) => {
    for (const viewport of [{ width: 1512, height: 827 }, { width: 1366, height: 768 }]) {
      await page.setViewportSize(viewport);
      await ready(page);
      await expect(page.locator('.model-chip')).toHaveCount(3);
      await expect(page.locator('.comparability-banner')).toHaveAttribute('data-status', 'partial');
      await expect(page.getByRole('heading', { name: 'Mean latency by batch' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Throughput at selected batch' })).toBeVisible();
      const runtimePlots = page.locator('.runtime-plots');
      await expect(async () => {
        const overflow = await runtimePlots.evaluate((el) => el.scrollHeight - el.clientHeight);
        expect(overflow).toBeLessThanOrEqual(1);
      }).toPass();
      await expect(page.locator('.evidence-strip')).toBeVisible();
    }
  });

  test('the latency chart scale toggle is keyboard-operable and switches to a logarithmic axis', async ({ page }) => {
    await ready(page);
    const logButton = page.getByRole('button', { name: 'Log', exact: true });
    await expect(logButton).toBeVisible();
    await logButton.focus();
    await page.keyboard.press('Enter');
    await expect(logButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('img', { name: /Mean latency by batch, logarithmic scale/ })).toBeVisible();
  });

  test('every chart exposes a visible, non-color-only model legend and metric summary raw values without relying on hover', async ({ page }) => {
    await ready(page);
    await expect(page.locator('.chart-legend').first()).toBeVisible();
    await expect(page.locator('.chart-legend .legend-marker').first()).toBeVisible();
    await expect(page.locator('.metric-values strong').first()).toBeVisible();
    // Data & evidence tables are the non-hover-only source of raw plotted values.
    await page.locator('.chart-data summary').first().click();
    await expect(page.locator('.chart-data table').first()).toBeVisible();
    await expect(page.locator('.chart-data th', { hasText: 'Technical Card' }).first()).toBeVisible();
  });

  test('respects prefers-reduced-motion: reduce by collapsing entrance animation durations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ready(page);
    const duration = await page.locator('.plot-card').first().evaluate((el) => getComputedStyle(el).animationDuration);
    expect(duration).toBe('1e-05s');
  });
});
