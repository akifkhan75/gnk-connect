import { expect, type Page } from '@playwright/test';

export const PORTAL = process.env.PORTAL_URL ?? 'http://127.0.0.1:4301';
export const ADMIN = process.env.ADMIN_URL ?? 'http://127.0.0.1:4302';

export const users = {
  partner: () => ({
    email: process.env.PARTNER_EMAIL ?? 'owner@alnoor.demo',
    password: process.env.PARTNER_PASSWORD ?? process.env.SEED_DEMO_PASSWORD ?? '',
  }),
  admin: () => ({
    email: process.env.ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? 'admin@ci.test',
    password: process.env.ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? '',
  }),
};

export async function signIn(page: Page, base: string, user: { email: string; password: string }) {
  await page.goto(`${base}/login`);
  await page.getByLabel(/email/i).fill(user.email);
  await page.locator('#password, input[type="password"]').first().fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
