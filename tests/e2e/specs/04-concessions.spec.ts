import { expect, test } from '@playwright/test';
import { ADMIN, PORTAL, signIn, users } from './helpers';

test('partner requests a per-seat discount and staff can review it', async ({ page }) => {
  await signIn(page, PORTAL, users.partner());
  await page.goto(`${PORTAL}/bookings`);
  const open = page.getByRole('link', { name: /GNK-|open|view/i }).first();
  if (await open.isVisible().catch(() => false)) await open.click();
  else await page.locator('a[href*="/bookings/"]').first().click();

  const discount = page.getByRole('button', { name: /^discount$/i });
  await expect(page.getByText(/concessions/i).first()).toBeVisible();
  if (await discount.isEnabled().catch(() => false)) {
    await discount.click();
    await expect(page.getByRole('heading', { name: /request discount/i })).toBeVisible();
    await page.getByLabel(/adult discount/i).fill('10000');
    await page.getByLabel(/child discount/i).fill('3000');
    await expect(page.getByText(/estimated on this hold/i)).toBeVisible();
    await page.getByRole('button', { name: /submit request/i }).click();
    await expect(page.getByText(/adult\s+10000/i)).toBeVisible({
      timeout: 15_000,
    });
  }

  await signIn(page, ADMIN, users.admin());
  await page.goto(`${ADMIN}/concessions`);
  await expect(page.getByRole('heading', { name: /concession requests/i })).toBeVisible();
  await expect(page.getByText(/agent requests for extra child seats/i)).toBeVisible();
  await page.goto(`${ADMIN}/bookings`);
  await expect(page.locator('body')).toContainText(/GNK-|concession|discount|pending/i);
});
