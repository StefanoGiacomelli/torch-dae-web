import type { Page } from '@playwright/test';

/** Wait for fonts and finite visual motion before making geometry assertions. */
export async function waitForVisualStability(page: Page, rootSelector?: string) {
  await page.evaluate(async (selector) => {
    if (document.fonts) await document.fonts.ready;

    const animationsForRoot = () => {
      if (!selector) return document.getAnimations();
      const root = document.querySelector(selector);
      return root?.getAnimations({ subtree: true }) ?? [];
    };

    // A completed transition can synchronously reveal another finite transition. Re-sample a
    // bounded number of times without introducing arbitrary wall-clock sleeps.
    for (let pass = 0; pass < 3; pass += 1) {
      const active = animationsForRoot().filter(
        (animation) => animation.pending || animation.playState === 'running',
      );
      if (active.length === 0) return;
      await Promise.allSettled(active.map((animation) => animation.finished));
    }
  }, rootSelector);
}
