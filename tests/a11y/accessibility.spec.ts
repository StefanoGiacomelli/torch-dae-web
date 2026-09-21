import { expect, test } from '@playwright/test';

for (const route of ['/', '/technical-cards/']) {
  test(`${route} has a usable semantic and keyboard baseline`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);

    const audit = await page.evaluate(() => {
      const ids = [...document.querySelectorAll<HTMLElement>('[id]')].map((element) => element.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      const unnamed = [...document.querySelectorAll<HTMLElement>('a, button, input, select, summary')]
        .filter((element) => {
          const hidden = element.closest('[aria-hidden="true"]') || getComputedStyle(element).display === 'none';
          const name = element.getAttribute('aria-label') || element.textContent?.trim() ||
            (element instanceof HTMLInputElement ? element.labels?.[0]?.textContent?.trim() : '');
          return !hidden && !name;
        })
        .map((element) => element.outerHTML.slice(0, 120));
      return { duplicateIds: [...new Set(duplicateIds)], unnamed };
    });
    expect(audit).toEqual({ duplicateIds: [], unnamed: [] });

    await page.locator('body').press('Tab');
    const firstFocus = await page.evaluate(() => document.activeElement?.tagName ?? '');
    expect(firstFocus).not.toBe('BODY');
    for (let index = 0; index < 30; index += 1) await page.keyboard.press('Tab');
    const finalFocus = await page.evaluate(() => document.activeElement?.tagName ?? '');
    expect(finalFocus).not.toBe('BODY');
  });
}
