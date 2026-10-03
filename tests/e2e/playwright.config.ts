import { defineConfig, devices } from '@playwright/test';

const PORTAL = process.env.PORTAL_URL ?? 'http://127.0.0.1:4301';
const ADMIN = process.env.ADMIN_URL ?? 'http://127.0.0.1:4302';
const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], trace: 'on-first-retry' },
  webServer: process.env.PORTAL_URL
    ? undefined
    : [
        {
          command: 'pnpm --filter @gnk/portal exec vite preview --host 127.0.0.1 --port 4301',
          url: PORTAL,
          reuseExistingServer: true,
          env: { VITE_API_URL: API },
        },
        {
          command: 'pnpm --filter @gnk/admin exec vite preview --host 127.0.0.1 --port 4302',
          url: ADMIN,
          reuseExistingServer: true,
          env: { VITE_API_URL: API },
        },
      ],
});
