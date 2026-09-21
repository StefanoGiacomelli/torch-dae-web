import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/a11y',
  outputDir: 'test-results/a11y',
  use: { baseURL: 'http://127.0.0.1:4321', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --ignore-lock',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium-a11y', use: { ...devices['Desktop Chrome'] } }],
});
