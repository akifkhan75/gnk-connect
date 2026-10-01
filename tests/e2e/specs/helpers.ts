import { expect, type Page } from '@playwright/test';

export const PORTAL = process.env.PORTAL_URL ?? 'http://localhost:4301';
export const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:4302';

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Set ${k} (see tests/e2e/playwright.config.ts)`);
  return v;
};

export const users = {
  partner: () => ({ email: need('PARTNER_EMAIL'), password: need('PARTNER_PASSWORD') }),
  admin: () => ({ email: need('ADMIN_EMAIL'), password: need('ADMIN_PASSWORD') }),
  finance: () => ({ email: need('FINANCE_EMAIL'), password: need('FINANCE_PASSWORD') }),
};

/** Unique per run, so reruns against the same database don't collide. */
export const RUN = Date.now().toString(36).toUpperCase();

export async function signIn(page: Page, base: string, user: { email: string; password: string }) {
  await page.goto(`${base}/login`);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** A small valid PDF for payment slips. */
export const slipPdf = () => ({
  name: 'deposit-slip.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  ),
});
