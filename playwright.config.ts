import { defineConfig, devices } from '@playwright/test';

const baseURL =
  process.env.UI_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:5173';

const jsonOutputFile =
  process.env.PLAYWRIGHT_JSON_OUTPUT_FILE || 'playwright-results.json';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['json', { outputFile: jsonOutputFile }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
