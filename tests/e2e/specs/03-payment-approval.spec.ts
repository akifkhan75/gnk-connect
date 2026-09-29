import { expect, test } from '@playwright/test';
import { ADMIN, PORTAL, RUN, signIn, slipPdf, users } from './helpers';

test('partner submits a payment with a slip; finance approves it; a receipt is issued', async ({
  browser,
}) => {
  const bankRef = `E2E${RUN}`;
  const portal = await browser.newPage();
  await signIn(portal, PORTAL, users.partner());
  await portal.goto(`${PORTAL}/payments`);
  await portal.getByRole('button', { name: 'Submit a payment' }).click();

  const dialog = portal.getByRole('dialog');
  await dialog.getByLabel('Amount (PKR)').fill('15000');
  await dialog.getByLabel('Bank or branch').fill('Meezan Bank, Blue Area');
  await dialog.getByLabel('Transaction / slip number').fill(bankRef);
  await dialog.locator('input[type=file]').setInputFiles(slipPdf());
  await expect(dialog.getByText('deposit-slip.pdf')).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(dialog).toBeHidden();
  const row = portal.getByRole('row', { name: new RegExp(bankRef) });
  await expect(row).toBeVisible();

  // Finance checks the slip and approves.
  const admin = await browser.newPage();
  await signIn(admin, ADMIN, users.finance());
  await admin.goto(`${ADMIN}/payments?status=SUBMITTED&q=${bankRef}`);
  await admin.getByText(bankRef).first().click();
  await admin.getByRole('button', { name: /Approve and credit/ }).click();
  await expect(admin.getByText(/approved — receipt RV-/)).toBeVisible();

  // The partner can open the receipt.
  await portal.reload();
  await portal
    .getByRole('row', { name: new RegExp(bankRef) })
    .getByRole('link', { name: /RV-/ })
    .click();
  await expect(portal.getByRole('article', { name: 'Payment receipt' })).toBeVisible();
  await expect(portal.getByText('PKR 15,000.00')).toBeVisible();
  const download = portal.waitForEvent('download');
  await portal.getByRole('button', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toMatch(/^RV-.*\.pdf$/);
});
