import { expect, test } from '@playwright/test';
import { ADMIN, PORTAL, signIn, users } from './helpers';

test.describe('sign-in', () => {
  test('partner signs in to the portal and sees their dashboard', async ({ page }) => {
    await signIn(page, PORTAL, users.partner());
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Assalam-o-Alaikum');
    await expect(page.getByText('Available to book')).toBeVisible();
  });

  test('a wrong password is refused with a message', async ({ page }) => {
    await page.goto(`${PORTAL}/login`);
    await page.getByLabel('Email').fill(users.partner().email);
    await page.getByLabel('Password', { exact: true }).fill('not-the-password-1');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('staff sign in to the admin console', async ({ page }) => {
    await signIn(page, ADMIN, users.admin());
    await expect(page.getByRole('navigation').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Payments' }).first()).toBeVisible();
  });

  test('signed-out visitors are sent to sign-in', async ({ page }) => {
    await page.goto(`${PORTAL}/payments`);
    await expect(page).toHaveURL(/\/login/);
  });
});
