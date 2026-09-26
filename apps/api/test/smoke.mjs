#!/usr/bin/env node
// End-to-end smoke test against a running API with demo data (npm run db:seed).
// Exercises the full partner → admin booking lifecycle plus key security checks.
//
//   API_URL=http://localhost:4000/api/v1 \
//   ADMIN_EMAIL=admin@gnkconnect.pk ADMIN_PASSWORD=... \
//   PARTNER_EMAIL=owner@alnoor.demo PARTNER_PASSWORD=... \
//   node test/smoke.mjs
import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';

const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const need = (k) => process.env[k] ?? (console.error(`Set ${k}`), process.exit(2));
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:3001'; // must be in the API's CORS_ORIGINS
const FORBIDDEN_KEYS = ['supplierNet', 'supplierNetUnit', 'markup', 'markupUnit', 'supplierBookingRef', 'internalNotes', 'pricingSnapshot', 'passportNumberEnc'];

let passed = 0;
const step = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    process.exit(1);
  }
};

function client(realm) {
  let token = null;
  let cookie = '';
  const call = async (method, path, body, headers = {}) => {
    const isForm = body instanceof FormData;
    const res = await fetch(API + path, {
      method,
      headers: {
        origin: ORIGIN,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(cookie ? { cookie } : {}),
        ...(body && !isForm ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    return { status: res.status, body: json };
  };
  return {
    call,
    async login(email, password) {
      const r = await call('POST', `/auth/${realm}/login`, { email, password });
      assert.equal(r.status, 200, `login failed: ${JSON.stringify(r.body)}`);
      token = r.body.accessToken;
      return r.body;
    },
    get token() {
      return token;
    },
  };
}

function assertNoLeak(value, where) {
  const walk = (v, path) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) {
        assert.ok(!FORBIDDEN_KEYS.includes(k), `${where} leaks "${k}" at ${path}.${k}`);
        walk(x, `${path}.${k}`);
      }
  };
  walk(value, '$');
}

const pdf = () => new Blob([Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF')], { type: 'application/pdf' });

const partner = client('partner');
const admin = client('staff');
let group, quote, booking;

console.log(`GNK Connect smoke test → ${API}\n`);

await step('partner and staff can sign in', async () => {
  await partner.login(need('PARTNER_EMAIL'), need('PARTNER_PASSWORD'));
  await admin.login(need('ADMIN_EMAIL'), need('ADMIN_PASSWORD'));
});

await step('public groups list has no prices or supplier data', async () => {
  const r = await fetch(`${API}/public/groups`).then((x) => x.json());
  assert.ok(r.items.length > 0, 'no public groups');
  assert.ok(!('price' in r.items[0]), 'public list exposes price');
  assertNoLeak(r, 'public groups');
});

await step('partner sees priced groups without net fares', async () => {
  const r = await partner.call('GET', '/partner/groups?pageSize=50');
  assert.equal(r.status, 200);
  assertNoLeak(r.body, 'partner groups');
  group = r.body.items.find((g) => g.seatsAvailable >= 2 && g.price);
  assert.ok(group, 'no bookable group with 2 seats');
  const d = await partner.call('GET', `/partner/groups/${group.productId}`);
  assert.equal(d.status, 200);
  assertNoLeak(d.body, 'group detail');
});

await step('partner token is rejected on admin routes', async () => {
  const r = await fetch(`${API}/admin/bookings`, { headers: { authorization: `Bearer ${partner.token}` } });
  assert.equal(r.status, 401);
});

await step('quote is issued server-side', async () => {
  const r = await partner.call('POST', '/partner/quotes', { departureId: group.departureId, seats: 2 });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  quote = r.body;
  assert.equal(quote.totalPrice, quote.unitPrice * 2);
  assertNoLeak(quote, 'quote');
});

const pax = (first) => ({
  type: 'ADULT',
  title: 'MR',
  firstName: first,
  lastName: 'KHAN',
  gender: 'MALE',
  dateOfBirth: '1988-04-12',
  nationality: 'PK',
  passportNumber: `AB${randomInt(1000000, 10000000)}`,
  passportExpiry: '2032-01-01',
});
const key = randomUUID();

await step('booking is created and idempotent on retry', async () => {
  const body = { quoteId: quote.id, passengers: [pax('ALI'), pax('OMAR')], acceptTerms: true };
  const r1 = await partner.call('POST', '/partner/bookings', body, { 'idempotency-key': key });
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  booking = r1.body;
  assert.equal(booking.status, 'PENDING_APPROVAL');
  assert.match(booking.reference, /^GNK-\d{4}-\d{6}$/);
  assert.ok(booking.passengers[0].passportMasked.startsWith('••••'));
  assertNoLeak(booking, 'booking');
  const r2 = await partner.call('POST', '/partner/bookings', body, { 'idempotency-key': key });
  assert.equal(r2.body.id, booking.id, 'retry created a second booking');
});

await step('a used quote cannot book again', async () => {
  const r = await partner.call('POST', '/partner/bookings', { quoteId: quote.id, passengers: [pax('A'), pax('B')], acceptTerms: true }, { 'idempotency-key': randomUUID() });
  assert.equal(r.status, 409);
});

await step('client-sent prices and mass-assigned fields are ignored', async () => {
  const q = await partner.call('POST', '/partner/quotes', { departureId: group.departureId, seats: 1, unitPrice: 1 });
  assert.equal(q.body.unitPrice, quote.unitPrice);
});

await step('admin approves and pushes to the supplier', async () => {
  const pending = await admin.call('GET', '/admin/bookings?tab=PENDING_APPROVAL&pageSize=100');
  assert.ok(pending.body.items.some((b) => b.id === booking.id), 'booking not in admin queue');
  const a = await admin.call('POST', `/admin/bookings/${booking.id}/approve`, {});
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.equal(a.body.status, 'APPROVED');
  assert.ok(a.body.priceAudit.supplierNetUnit > 0, 'admin should see net fare');
  const p = await admin.call('POST', `/admin/bookings/${booking.id}/push`);
  assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.equal(p.body.status, 'CONFIRMED', `push ended in ${p.body.status}`);
  assert.ok(p.body.supplierBookingRef);
});

let balanceAfterBooking;
await step('partner is charged, sees PNR and an invoice', async () => {
  const b = await partner.call('GET', `/partner/bookings/${booking.id}`);
  assert.equal(b.body.status, 'CONFIRMED');
  assert.ok(b.body.pnr, 'no PNR');
  assert.equal(b.body.paymentState, 'PAID');
  assertNoLeak(b.body, 'confirmed booking');
  const inv = await partner.call('GET', '/partner/invoices');
  const mine = inv.body.find((i) => i.bookingId === booking.id);
  assert.ok(mine, 'no invoice');
  const detail = await partner.call('GET', `/partner/invoices/${mine.id}`);
  assert.equal(detail.body.total, booking.totalPrice);
  balanceAfterBooking = (await partner.call('GET', '/partner/ledger/balance')).body.balance;
});

await step('partner deposit is verified and credited', async () => {
  const form = new FormData();
  form.append('file', pdf(), 'slip.pdf');
  const up = await partner.call('POST', '/partner/files?purpose=PAYMENT_PROOF', form);
  assert.equal(up.status, 201, JSON.stringify(up.body));
  const pay = await partner.call('POST', '/partner/payments', {
    method: 'BANK_TRANSFER',
    amount: booking.totalPrice,
    bankName: 'Meezan Bank',
    transactionRef: `FT${Date.now()}`,
    paidAt: new Date().toISOString().slice(0, 10),
    bookingId: booking.id,
    proofFileId: up.body.id,
  });
  assert.equal(pay.status, 201, JSON.stringify(pay.body));
  const v = await admin.call('POST', `/admin/payments/${pay.body.id}/verify`);
  assert.equal(v.body.status, 'VERIFIED');
  const bal = (await partner.call('GET', '/partner/ledger/balance')).body.balance;
  assert.equal(Math.round(bal - balanceAfterBooking), Math.round(booking.totalPrice));
  const st = await partner.call('GET', '/partner/ledger/statement');
  assert.ok(st.body.lines.length >= 2, 'statement missing lines');
});

await step('uploads reject non-document files', async () => {
  const form = new FormData();
  form.append('file', new Blob([Buffer.from('MZ\x90\x00 fake exe')]), 'invoice.pdf');
  const r = await partner.call('POST', '/partner/files?purpose=KYC', form);
  assert.equal(r.status, 400);
});

await step('confirmed booking cannot be cancelled by the partner', async () => {
  const r = await partner.call('POST', `/partner/bookings/${booking.id}/cancel`, { reason: 'test' });
  assert.equal(r.status, 409);
});

await step('admin cancellation refunds the partner', async () => {
  const before = (await partner.call('GET', '/partner/ledger/balance')).body.balance;
  const r = await admin.call('POST', `/admin/bookings/${booking.id}/cancel`, { reason: 'Smoke test cleanup' });
  assert.equal(r.body.status, 'CANCELLED');
  const after = (await partner.call('GET', '/partner/ledger/balance')).body.balance;
  assert.equal(Math.round(after - before), Math.round(booking.totalPrice));
});

await step('audit trail recorded the actions', async () => {
  const r = await admin.call('GET', `/admin/audit?entityId=${booking.id}`);
  const actions = r.body.items.map((i) => i.action);
  for (const a of ['booking.create', 'booking.approve', 'booking.push', 'booking.cancel']) assert.ok(actions.includes(a), `missing ${a}`);
});

await step('refresh rotates and logout ends the session', async () => {
  const r1 = await partner.call('POST', '/auth/partner/refresh', {}, { 'x-gnk-csrf': '1' });
  assert.equal(r1.status, 200);
  const out = await partner.call('POST', '/auth/partner/logout', undefined, { 'x-gnk-csrf': '1' });
  assert.equal(out.status, 204);
  const r2 = await partner.call('POST', '/auth/partner/refresh', {}, { 'x-gnk-csrf': '1' });
  assert.equal(r2.status, 401);
});

console.log(`\n${passed} checks passed`);
