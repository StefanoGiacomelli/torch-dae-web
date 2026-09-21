import { expect, test } from '@playwright/test';

test('GitHub Pages base path supports navigation, query state, and deep-route reload', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Model Cards', level: 1 })).toBeVisible();
  const technicalLink = page.getByRole('link', { name: 'Technical Cards' });
  await expect(technicalLink).toHaveAttribute('href', '/torch-dae-web/technical-cards/');
  await technicalLink.click();
  await expect(page).toHaveURL(/\/torch-dae-web\/technical-cards\/$/);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0, { timeout: 10_000 });
  await page.locator('.model-chip button').last().click();
  await expect(page).toHaveURL(/models=/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Technical Cards', level: 1 })).toBeVisible();
  await expect(page.locator('.model-chip')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'torch-dae Model Cards' })).toHaveAttribute('href', '/torch-dae-web/');
});
