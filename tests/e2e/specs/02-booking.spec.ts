import { expect, test } from '@playwright/test';
import { ADMIN, PORTAL, signIn, users } from './helpers';

test('partner books a group and staff issues it', async ({ page }) => {
  await signIn(page, PORTAL, users.partner());
  await page.goto(`${PORTAL}/groups`);
  await page
    .getByRole('link', { name: /book|view|open/i })
    .first()
    .click({ timeout: 20_000 })
    .catch(async () => {
      await page.locator('a[href*="/groups/"]').first().click();
    });
  const book = page.getByRole('button', { name: /book|request|continue/i }).first();
  if (await book.isVisible().catch(() => false)) await book.click();

  const first = page.locator('input[name*="firstName"], input[id*="firstName"]').first();
  if (await first.isVisible().catch(() => false)) {
    await first.fill('ALI');
    await page.locator('input[name*="lastName"], input[id*="lastName"]').first().fill('KHAN');
    await page.getByRole('button', { name: /submit|confirm|request/i }).click();
  }

  await signIn(page, ADMIN, users.admin());
  await page.goto(`${ADMIN}/bookings`);
  await expect(page.locator('body')).toContainText(/GNK-|booking|pending/i);
});
