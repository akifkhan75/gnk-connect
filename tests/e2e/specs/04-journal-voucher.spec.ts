import { expect, test, type Page } from '@playwright/test';
import { ADMIN, RUN, signIn, users } from './helpers';

async function pickAccount(page: Page, index: number, code: string) {
  const box = page.getByRole('combobox').nth(index);
  await box.click();
  await box.fill(code);
  await page.keyboard.press('Enter');
}

test('a journal voucher is prepared by one person and approved and posted by another', async ({
  browser,
}) => {
  const narration = `E2E accrual ${RUN}`;
  const maker = await browser.newPage();
  await signIn(maker, ADMIN, users.admin());
  await maker.goto(`${ADMIN}/accounting/vouchers/new?type=JOURNAL`);
  await maker.getByLabel('Narration').fill(narration);

  // Dr cash in hand 1,250 / Cr adjustments 1,250
  await pickAccount(maker, 0, '1110');
  await maker.getByRole('spinbutton', { name: 'Debit' }).first().fill('1250');
  await pickAccount(maker, 1, '5900');
  await maker.getByRole('spinbutton', { name: 'Credit' }).nth(1).fill('1250');
  await maker.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(maker).toHaveURL(/\/accounting\/vouchers\/[0-9a-f-]{36}/);
  await expect(maker.getByText('Submitted').first()).toBeVisible();
  const voucherUrl = maker.url().replace(/\?.*$/, '');

  // The checker approves; it gets a JV number.
  const checker = await browser.newPage();
  await signIn(checker, ADMIN, users.finance());
  await checker.goto(voucherUrl);
  await checker.getByRole('button', { name: 'Approve and post' }).click();
  await checker.getByRole('dialog').getByRole('button', { name: 'Approve and post' }).click();
  await expect(checker.getByText('Posted').first()).toBeVisible();
  await expect(checker.getByText(/JV-\d{4}-\d{6}/).first()).toBeVisible();
});
