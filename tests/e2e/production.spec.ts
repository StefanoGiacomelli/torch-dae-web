import { expect, test } from '@playwright/test';

for (const route of ['/', '/technical-cards/']) {
  test(`${route} production page has no console, page, or hydration errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(route);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0, { timeout: 10_000 });
    await page.waitForTimeout(100);
    expect(errors).toEqual([]);
  });
}
