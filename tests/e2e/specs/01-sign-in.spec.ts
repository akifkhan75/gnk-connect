import { expect, test } from '@playwright/test';
import { ADMIN, PORTAL, signIn, users } from './helpers';

test('partner signs in to the dashboard', async ({ page }) => {
  await signIn(page, PORTAL, users.partner());
  await expect(page.getByRole('heading').first()).toBeVisible();
});

test('wrong password stays on the login page', async ({ page }) => {
  await page.goto(`${PORTAL}/login`);
  await page.getByLabel(/email/i).fill(users.partner().email);
  await page.locator('input[type="password"]').fill('definitely-wrong-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(
    page.locator('[role="alert"], .text-danger, [class*="danger"]').first(),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('staff signs in to the admin console', async ({ page }) => {
  await signIn(page, ADMIN, users.admin());
  await expect(page).not.toHaveURL(/\/login/);
});

test('unauthenticated admin routes bounce to login', async ({ page }) => {
  await page.goto(`${ADMIN}/bookings`);
  await expect(page).toHaveURL(/\/login/);
});
