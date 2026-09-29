import { expect, test } from '@playwright/test';
import { ADMIN, PORTAL, RUN, signIn, users } from './helpers';

test('partner books a group seat; staff approve and issue it; partner sees it confirmed', async ({
  browser,
}) => {
  const portal = await browser.newPage();
  await signIn(portal, PORTAL, users.partner());

  // Cheapest group ticket, so it fits the demo credit whatever the date.
  await portal.goto(`${PORTAL}/book/groups`);
  await portal.getByRole('combobox', { name: 'Sort' }).selectOption({ label: 'Sort: fare' });
  await portal.getByRole('main').getByRole('link', { name: 'Book', exact: true }).first().click();
  await portal.getByRole('button', { name: 'Continue to passengers' }).click();
  await expect(portal).toHaveURL(/\/bookings\/new\?quote=/);

  await portal.getByLabel('Given name(s)').fill('IMRAN');
  await portal.getByLabel('Surname').fill('QURESHI');
  await portal.getByLabel('Date of birth').fill('1985-06-15');
  await portal.getByLabel('Nationality').fill('PK');
  await portal.getByLabel('Passport no.').fill(`PW${RUN}`.slice(0, 9));
  await portal.getByLabel('Passport expiry').fill('2033-01-31');
  await portal.getByRole('button', { name: 'Review booking' }).click();
  await portal.getByLabel(/I confirm passenger names match/).check();
  await portal.getByRole('button', { name: 'Submit booking request' }).click();

  await expect(portal).toHaveURL(/\/bookings\/[0-9a-f-]{36}$/);
  const reference = (await portal
    .getByText(/GNK-\d{4}-\d{6}/)
    .first()
    .textContent())!.match(/GNK-\d{4}-\d{6}/)![0];
  const bookingUrl = portal.url();

  // Staff approve and issue it in one step.
  const admin = await browser.newPage();
  await signIn(admin, ADMIN, users.admin());
  await admin.goto(`${ADMIN}/bookings?q=${reference}`);
  await admin.getByText(reference).first().click();
  await admin.getByRole('button', { name: 'Approve & issue' }).click();
  await expect(admin.getByText('Confirmed').first()).toBeVisible({ timeout: 20_000 });

  // The partner's page updates (live, or on reload) with the confirmation and PNR.
  await portal.goto(bookingUrl);
  await expect(portal.getByText('Confirmed').first()).toBeVisible();
  await expect(portal.getByText(/PNR/).first()).toBeVisible();
});
