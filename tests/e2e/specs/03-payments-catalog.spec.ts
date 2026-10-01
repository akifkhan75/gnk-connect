import { expect, test } from '@playwright/test';
import { ADMIN, PORTAL, signIn, users } from './helpers';

test('partner payments page and admin payments queue load', async ({ page }) => {
  await signIn(page, PORTAL, users.partner());
  await page.goto(`${PORTAL}/payments`);
  await expect(page.locator('body')).toBeVisible();

  await signIn(page, ADMIN, users.admin());
  await page.goto(`${ADMIN}/payments`);
  await expect(page.locator('body')).toContainText(/payment|verify|queue/i);
});

test('catalog and settings pages load for staff', async ({ page }) => {
  await signIn(page, ADMIN, users.admin());
  await page.goto(`${ADMIN}/catalog`);
  await expect(page.locator('body')).toBeVisible();
  await page.goto(`${ADMIN}/settings`);
  await expect(page.locator('body')).toBeVisible();
});
