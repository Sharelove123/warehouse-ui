import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Load local .env for developer convenience without overriding shell/evaluator env vars.
const envFilePath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFilePath)) {
  const lines = fs.readFileSync(envFilePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

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
