import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests of the key flows against production builds of the portal and admin.
 * The API must already be running with demo data (CI starts it; see README).
 *
 *   PORTAL_URL / ADMIN_URL   where the built apps are served (defaults: vite preview below)
 *   API_URL                  passed to the builds as VITE_API_URL
 *   ADMIN_EMAIL / ADMIN_PASSWORD, PARTNER_EMAIL / PARTNER_PASSWORD,
 *   FINANCE_EMAIL / FINANCE_PASSWORD   seeded users
 */
const PORTAL_URL = process.env.PORTAL_URL ?? 'http://localhost:4301';
const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:4302';
const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const serve = (app: string, port: number) => ({
  command: `pnpm --filter @gnk/${app} exec vite build && pnpm --filter @gnk/${app} exec vite preview --port ${port} --strictPort`,
  url: `http://localhost:${port}`,
  env: { VITE_API_URL: API_URL },
  reuseExistingServer: !process.env.CI,
  timeout: 180_000,
});

export default defineConfig({
  testDir: './specs',
  // The flows share one database and build on each other (book → pay → approve).
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    ...(process.env.PORTAL_URL ? [] : [serve('portal', 4301)]),
    ...(process.env.ADMIN_URL ? [] : [serve('admin', 4302)]),
  ],
  metadata: { PORTAL_URL, ADMIN_URL },
});
