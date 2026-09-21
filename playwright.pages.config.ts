import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/pages',
  outputDir: 'test-results/pages',
  use: { baseURL: 'http://127.0.0.1:4321/torch-dae-web/', trace: 'retain-on-failure' },
  webServer: {
    command: 'ASTRO_SITE_URL=https://stefanogiacomelli.github.io ASTRO_BASE_PATH=/torch-dae-web/ npm run preview -- --host 127.0.0.1 --ignore-lock',
    url: 'http://127.0.0.1:4321/torch-dae-web/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium-pages', use: { ...devices['Desktop Chrome'] } }],
});
