import { expect, test } from '@playwright/test';

test.describe('Navbar on narrow viewports', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('Technical Cards and Day/Night remain directly reachable at 390x844', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Technical Cards' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Day/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Night/ })).toBeVisible();
  });

  test('GitHub, Documentation, and PyPI remain reachable via the compact overflow menu at 390x844', async ({
    page,
  }) => {
    await page.goto('/');
    const trigger = page.locator('.navbar-more > summary');
    await expect(trigger).toBeVisible();
    // The full-width link row must be hidden (not merely visually collapsed) at this width.
    await expect(page.locator('.navbar-external-links')).toBeHidden();

    await trigger.click();
    const menu = page.locator('.navbar-more-menu');
    await expect(menu.getByRole('link', { name: /GitHub/ })).toBeVisible();
    await expect(menu.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/StefanoGiacomelli/torch_dae',
    );
    await expect(menu.getByRole('link', { name: /Documentation/ })).toHaveAttribute(
      'href',
      'https://torch-dae.readthedocs.io/en/latest/',
    );
    await expect(menu.getByRole('link', { name: /PyPI/ })).toHaveAttribute(
      'href',
      'https://pypi.org/project/torch-deepaudioembedding/',
    );
  });

  test('the overflow menu opens and closes via the keyboard', async ({ page }) => {
    await page.goto('/');
    const trigger = page.locator('.navbar-more > summary');
    const menu = page.locator('.navbar-more-menu');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(menu.getByRole('link', { name: /GitHub/ })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(menu.getByRole('link', { name: /GitHub/ })).toBeHidden();
  });

  test('no document-level vertical scrollbar regression at 390x844', async ({ page }) => {
    await page.goto('/');
    const { scrollHeight, clientHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: window.innerHeight,
    }));
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 2);
  });

  test('visually hidden mobile side cards cannot receive keyboard focus via Tab', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);

    // Start from a known point just before the carousel controls in tab order.
    await page.locator('.carousel-nav-prev').focus();
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || !el.classList.contains('model-card-select-overlay')) return null;
        return el.closest('[data-offset]')?.getAttribute('data-offset') ?? null;
      });
      // A card's own select overlay may only be focused while it is the centered (offset "0")
      // card; ±1/±2 cards are hidden at this width and must never receive focus.
      if (focused !== null) {
        expect(focused).toBe('0');
      }
    }
  });
});
