import { expect, test } from '@playwright/test';

test('Model Cards route renders canonical data and toggles theme', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Model Cards', level: 1 })).toBeVisible();
  await expect(page.locator('[data-model-id]')).toHaveCount(3);
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr', { timeout: 10_000 });
  await page.getByRole('button', { name: /Night/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
});

test('Technical Cards route renders canonical contexts', async ({ page }) => {
  await page.goto('/technical-cards');
  await expect(page.getByRole('heading', { name: 'Technical Cards', level: 1 })).toBeVisible();
  await expect(page.locator('[data-technical-card-id]')).toHaveCount(9);
});
