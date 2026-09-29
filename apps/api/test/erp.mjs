#!/usr/bin/env node
// End-to-end test of accounting, users/roles, payments/receipts and live events,
// against a running API with demo data. Run after smoke.mjs or on its own.
//
//   API_URL=http://localhost:4000/api/v1 \
//   ADMIN_EMAIL=admin@gnkconnect.pk ADMIN_PASSWORD=... \
//   PARTNER_EMAIL=owner@alnoor.demo PARTNER_PASSWORD=... \
//   node test/erp.mjs
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';

const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const need = (k) => process.env[k] ?? (console.error(`Set ${k}`), process.exit(2));
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:3001';
const RUN = randomInt(100000, 1000000); // keeps codes and emails unique across runs

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
  const call = async (method, path, body, extraHeaders = {}) => {
    const isForm = body instanceof FormData;
    const res = await fetch(API + path, {
      method,
      headers: {
        ...extraHeaders,
        origin: ORIGIN,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(cookie ? { cookie } : {}),
        ...(body && !isForm ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  const ok = async (method, path, body, status = [200, 201, 204]) => {
    const r = await call(method, path, body);
    assert.ok([status].flat().includes(r.status), `${method} ${path} → ${r.status} ${JSON.stringify(r.body)}`);
    return r.body;
  };
  return {
    call,
    ok,
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

/** Opens the SSE stream with the bearer token and collects "change" events. */
function listen(c, realm) {
  const events = [];
  const ctrl = new AbortController();
  const ready = (async () => {
    const res = await fetch(`${API}/${realm}/events`, {
      headers: { origin: ORIGIN, authorization: `Bearer ${c.token}` },
      signal: ctrl.signal,
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/event-stream/);
    return res.body.getReader();
  })();
  let buffer = '';
  const pump = ready.then(async (reader) => {
    const dec = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read().catch(() => ({ done: true }));
      if (done) return;
      buffer += dec.decode(value, { stream: true });
      let i;
      while ((i = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, i);
        buffer = buffer.slice(i + 2);
        const event = /^event: (.*)$/m.exec(block)?.[1];
        const data = /^data: (.*)$/m.exec(block)?.[1];
        if (event === 'change' && data) events.push(JSON.parse(data));
      }
    }
  });
  return {
    ready,
    events,
    async waitFor(pred, ms = 4000) {
      const until = Date.now() + ms;
      while (Date.now() < until) {
        if (events.some(pred)) return;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error(`no matching event; got ${JSON.stringify(events)}`);
    },
    close: () => {
      ctrl.abort();
      return pump.catch(() => undefined);
    },
  };
}

const pdf = () =>
  new Blob([Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF')], { type: 'application/pdf' });
const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
const lastMonth = () => {
  const d = new Date(`${today().slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
};

const admin = client('staff');
const partner = client('partner');
const finance = client('staff');
let accounts; // chart
let financeUser;
let sarAccount;
let jv;

console.log(`GNK Connect ERP test → ${API}\n`);

await step('sign in', async () => {
  await admin.login(need('ADMIN_EMAIL'), need('ADMIN_PASSWORD'));
  await partner.login(need('PARTNER_EMAIL'), need('PARTNER_PASSWORD'));
});

// ---------- Users & roles ----------

await step('admin adds a finance user with a temporary password', async () => {
  financeUser = await admin.ok('POST', '/admin/staff', {
    email: `finance.${RUN}@gnk.test`,
    fullName: 'Fatima Finance',
    roles: ['FINANCE'],
    mode: 'password',
    password: 'Temporary-pass-123',
  });
  assert.equal(financeUser.mustChangePassword, true);
  assert.equal(financeUser.status, 'ACTIVE');
});

await step('temporary password must be changed before anything else', async () => {
  const s = await finance.login(`finance.${RUN}@gnk.test`, 'Temporary-pass-123');
  assert.equal(s.session.user.mustChangePassword, true);
  const blocked = await finance.call('GET', '/admin/accounting/accounts');
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'PASSWORD_CHANGE_REQUIRED');
  const same = await finance.call('POST', '/auth/staff/set-password', {
    password: 'Temporary-pass-123',
    confirmPassword: 'Temporary-pass-123',
  });
  assert.equal(same.status, 422);
  await finance.ok('POST', '/auth/staff/set-password', {
    password: 'Quiet-harbour-456',
    confirmPassword: 'Quiet-harbour-456',
  });
  const me = await finance.ok('GET', '/auth/staff/me');
  assert.equal(me.user.mustChangePassword, false);
  await finance.ok('GET', '/admin/accounting/accounts');
});

await step('custom roles: create, and no privilege escalation', async () => {
  const role = await admin.ok('POST', '/admin/roles', {
    name: `Cashier ${RUN}`,
    description: 'Records receipts only',
    permissions: ['payments:read', 'payments:verify', 'ledger:read'],
  });
  assert.equal(role.isSystem, false);
  assert.ok(role.key.startsWith('CUSTOM_'));
  // Finance cannot manage roles at all, nor grant SUPER_ADMIN.
  const r1 = await finance.call('POST', '/admin/roles', { name: 'x', permissions: ['audit:read'] });
  assert.equal(r1.status, 403);
  const roles = await admin.ok('GET', '/admin/roles');
  const system = roles.find((r) => r.key === 'FINANCE');
  const r2 = await admin.call('PATCH', `/admin/roles/${system.id}`, { name: 'Finance two', permissions: ['audit:read'] });
  assert.equal(r2.status, 400, 'system roles are read-only');
  await admin.ok('DELETE', `/admin/roles/${role.id}`);
});

// ---------- Chart of accounts & currencies ----------

await step('chart of accounts is seeded with system accounts', async () => {
  accounts = await admin.ok('GET', '/admin/accounting/accounts');
  for (const key of ['CASH', 'BANK', 'AR_CONTROL', 'SUPPLIER_PAYABLE', 'REVENUE', 'FX', 'ADJUSTMENTS'])
    assert.ok(accounts.some((a) => a.systemKey === key), `missing ${key}`);
  const ar = accounts.find((a) => a.systemKey === 'AR_CONTROL');
  assert.ok(ar.isGroup);
});

await step('a SAR supplier payable account and a manual rate', async () => {
  const group = accounts.find((a) => a.code === '2100');
  sarAccount = await finance.ok('POST', '/admin/accounting/accounts', {
    code: `21${RUN}`.slice(0, 8),
    name: `Al Haram Hotels (SAR) ${RUN}`,
    class: 'LIABILITY',
    parentId: group.id,
    currency: 'SAR',
  });
  assert.equal(sarAccount.currency, 'SAR');
  const wrongClass = await finance.call('POST', '/admin/accounting/accounts', {
    code: `9${RUN}`,
    name: 'Wrong',
    class: 'ASSET',
    parentId: group.id,
  });
  assert.equal(wrongClass.status, 400);
  const rates = await finance.ok('POST', '/admin/accounting/rates', {
    currency: 'SAR',
    rate: 70,
    date: today(),
  });
  assert.equal(rates[0].rate, 70);
  const pub = await fetch(`${API}/public/rates`, { headers: { origin: ORIGIN } }).then((r) => r.json());
  assert.equal(pub.base, 'PKR');
  assert.equal(pub.rates.SAR, 70, 'the website sees the latest SAR rate');
  assert.ok(!('PKR' in pub.rates));
});

// ---------- Journal vouchers (maker-checker) ----------

await step('JV: receivable PKR 70,000 against payable SAR 1,000 @ 70', async () => {
  const me = await partner.ok('GET', '/auth/partner/me');
  const ar = (await finance.ok('GET', '/admin/accounting/accounts')).find(
    (a) => a.partnerAccountId === me.account.accountId,
  );
  assert.ok(ar, 'partner receivable exists after the smoke test');
  jv = await finance.ok('POST', '/admin/accounting/vouchers', {
    type: 'JOURNAL',
    date: today(),
    description: 'Hotel block recharge',
    lines: [
      { accountId: ar.id, side: 'DEBIT', amount: 70000 },
      { accountId: sarAccount.id, side: 'CREDIT', fcAmount: 1000, rate: 70, narration: 'Makkah 3 nights' },
    ],
    action: 'submit',
  });
  assert.equal(jv.status, 'SUBMITTED');
  assert.ok(jv.reference.startsWith('DRAFT-'), 'numbered on posting');
  assert.equal(jv.lines[1].credit, 70000, 'PKR = 1,000 × 70');
  assert.equal(jv.lines[1].currency, 'SAR');
  // The maker cannot approve their own voucher.
  const self = await finance.call('POST', `/admin/accounting/vouchers/${jv.id}/approve`);
  assert.equal(self.status, 403);
});

await step('checker approves: JV is numbered and posted', async () => {
  const posted = await admin.ok('POST', `/admin/accounting/vouchers/${jv.id}/approve`);
  assert.equal(posted.status, 'POSTED');
  assert.match(posted.reference, /^JV-\d{4}-\d{6}$/);
  assert.equal(posted.approvedBy.name.length > 0, true);
  const bal = await finance.ok('GET', `/admin/accounting/accounts/${sarAccount.id}/balance`);
  assert.equal(bal.balance, -70000);
  assert.equal(bal.fcBalance, -1000);
  assert.equal(bal.carryingRate, 70);
  const gl = await finance.ok('GET', `/admin/accounting/accounts/${sarAccount.id}/ledger`);
  assert.equal(gl.lines.at(-1).fcBalance, -1000);
});

await step('trial balance balances', async () => {
  const tb = await finance.ok('GET', '/admin/accounting/reports/trial-balance');
  assert.ok(tb.rows.length > 2);
  assert.equal(tb.totalDebit, tb.totalCredit);
  const pl = await finance.ok('GET', '/admin/accounting/reports/income-statement');
  assert.equal(typeof pl.netProfit, 'number');
});

await step('unbalanced and group-account vouchers are refused', async () => {
  const cash = accounts.find((a) => a.systemKey === 'CASH');
  const bank = accounts.find((a) => a.systemKey === 'BANK');
  const draft = await finance.ok('POST', '/admin/accounting/vouchers', {
    type: 'JOURNAL',
    date: today(),
    description: 'Unbalanced',
    lines: [
      { accountId: cash.id, side: 'DEBIT', amount: 100 },
      { accountId: bank.id, side: 'CREDIT', amount: 90 },
    ],
  });
  assert.equal(draft.status, 'DRAFT');
  const sub = await finance.call('POST', `/admin/accounting/vouchers/${draft.id}/submit`);
  assert.equal(sub.status, 400);
  assert.equal(sub.body.code, 'VOUCHER_UNBALANCED');
  await finance.ok('DELETE', `/admin/accounting/vouchers/${draft.id}`);
  const group = accounts.find((a) => a.code === '1100');
  const grp = await finance.call('POST', '/admin/accounting/vouchers', {
    type: 'PAYMENT',
    date: today(),
    description: 'Group',
    lines: [
      { accountId: group.id, side: 'DEBIT', amount: 10 },
      { accountId: bank.id, side: 'CREDIT', amount: 10 },
    ],
    action: 'post',
  });
  assert.equal(grp.status, 400);
});

await step('reversal restores the SAR balance', async () => {
  const rev = await admin.ok('POST', `/admin/accounting/vouchers/${jv.id}/reverse`, {
    date: today(),
    reason: 'Posted to the wrong partner',
  });
  assert.match(rev.reference, /^REV-/);
  assert.equal(rev.reversalOf.id, jv.id);
  const bal = await finance.ok('GET', `/admin/accounting/accounts/${sarAccount.id}/balance`);
  assert.equal(bal.balance, 0);
  assert.equal(bal.fcBalance, 0);
  const again = await admin.call('POST', `/admin/accounting/vouchers/${jv.id}/reverse`, {
    date: today(),
    reason: 'twice',
  });
  assert.equal(again.status, 409);
});

await step('payment voucher posts directly; closed periods refuse postings', async () => {
  const cash = accounts.find((a) => a.systemKey === 'CASH');
  const charges = accounts.find((a) => a.systemKey === 'BANK_CHARGES');
  const month = lastMonth();
  await finance.ok('POST', '/admin/accounting/periods/close', { month });
  const closed = await finance.call('POST', '/admin/accounting/vouchers', {
    type: 'PAYMENT',
    date: `${month}-15`,
    description: 'Late entry',
    lines: [
      { accountId: charges.id, side: 'DEBIT', amount: 500 },
      { accountId: cash.id, side: 'CREDIT', amount: 500 },
    ],
    action: 'post',
  });
  assert.equal(closed.status, 409);
  assert.equal(closed.body.code, 'PERIOD_CLOSED');
  // The draft survived; move it into the open period and post it.
  const drafts = await finance.ok('GET', '/admin/accounting/vouchers?status=DRAFT&type=PAYMENT');
  const d = drafts.items.find((v) => v.description === 'Late entry');
  await finance.ok('PUT', `/admin/accounting/vouchers/${d.id}`, {
    type: 'PAYMENT',
    date: today(),
    description: 'Late entry',
    lines: [
      { accountId: charges.id, side: 'DEBIT', amount: 500 },
      { accountId: cash.id, side: 'CREDIT', amount: 500 },
    ],
  });
  const pv = await finance.ok('POST', `/admin/accounting/vouchers/${d.id}/post`);
  assert.match(pv.reference, /^PV-/);
  await finance.ok('POST', '/admin/accounting/periods/reopen', { month });
});

// ---------- Payments & receipts ----------

let payment;
await step('partner submits a payment with two attachments', async () => {
  const ids = [];
  for (const name of ['slip.pdf', 'screenshot.pdf']) {
    const form = new FormData();
    form.append('file', pdf(), name);
    ids.push((await partner.ok('POST', '/partner/files?purpose=PAYMENT_PROOF', form)).id);
  }
  payment = await partner.ok('POST', '/partner/payments', {
    method: 'BANK_TRANSFER',
    amount: 25000,
    bankName: 'HBL',
    transactionRef: `IBFT${RUN}`,
    paidAt: today(),
    attachmentIds: ids,
    notes: 'Advance for next group',
  });
  assert.equal(payment.attachments.length, 2);
  assert.equal(payment.receipt, null);
});

await step('admin approves into a chosen account and a receipt is issued (live)', async () => {
  const stream = listen(partner, 'partner');
  await stream.ready;
  const cash = accounts.find((a) => a.systemKey === 'CASH');
  const v = await admin.ok('POST', `/admin/payments/${payment.id}/verify`, { depositAccountId: cash.id });
  assert.equal(v.status, 'VERIFIED');
  assert.equal(v.depositAccount.code, '1110');
  assert.match(v.receipt.number, /^RV-/);
  await stream.waitFor((e) => e.topic === 'payment' && e.id === payment.id);
  await stream.waitFor((e) => e.topic === 'notification');
  await stream.close();
  const receipt = await partner.ok('GET', `/partner/payments/${payment.id}/receipt`);
  assert.equal(receipt.number, v.receipt.number);
  assert.equal(receipt.payment.amount, 25000);
});

await step('the receipt downloads as a PDF (partner and admin)', async () => {
  for (const [c, path] of [
    [partner, `/partner/payments/${payment.id}/receipt/pdf`],
    [admin, `/admin/payments/${payment.id}/receipt/pdf`],
  ]) {
    const res = await fetch(API + path, {
      headers: { origin: ORIGIN, authorization: `Bearer ${c.token}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.match(res.headers.get('content-disposition') ?? '', /RV-.*\.pdf/);
    const bytes = Buffer.from(await res.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    assert.ok(bytes.length > 2000, `PDF is only ${bytes.length} bytes`);
  }
  const other = await partner.call('GET', `/partner/payments/00000000-0000-7000-8000-000000000000/receipt/pdf`);
  assert.equal(other.status, 404);
});

await step('large payments need two different approvers', async () => {
  const form = new FormData();
  form.append('file', pdf(), 'big.pdf');
  const file = await partner.ok('POST', '/partner/files?purpose=PAYMENT_PROOF', form);
  const big = await partner.ok('POST', '/partner/payments', {
    method: 'BANK_TRANSFER',
    amount: 750000,
    bankName: 'MCB',
    transactionRef: `IBFT${RUN}BIG`,
    paidAt: today(),
    attachmentIds: [file.id],
  });
  const first = await admin.ok('POST', `/admin/payments/${big.id}/verify`, {});
  assert.equal(first.status, 'SUBMITTED');
  assert.equal(first.approvalsRequired, 2);
  assert.equal(first.needsSecondApproval, true);
  assert.equal(first.receipt, null);
  const self = await admin.call('POST', `/admin/payments/${big.id}/verify`, {});
  assert.equal(self.status, 409);
  assert.equal(self.body.code, 'MAKER_CHECKER');
  const done = await finance.ok('POST', `/admin/payments/${big.id}/verify`, {});
  assert.equal(done.status, 'VERIFIED');
  assert.equal(done.needsSecondApproval, false);
  assert.match(done.receipt.number, /^RV-/);
  const log = await admin.ok('GET', '/admin/audit?action=payment.first_approval');
  assert.ok(log.items.some((i) => i.entityId === big.id));
});

await step('a group or foreign account cannot receive deposits', async () => {
  const form = new FormData();
  form.append('file', pdf(), 'x.pdf');
  const file = await partner.ok('POST', '/partner/files?purpose=PAYMENT_PROOF', form);
  const p = await partner.ok('POST', '/partner/payments', {
    method: 'BANK_TRANSFER',
    amount: 100,
    bankName: 'HBL',
    transactionRef: `IBFT${RUN}B`,
    paidAt: today(),
    attachmentIds: [file.id],
  });
  const bad = await admin.call('POST', `/admin/payments/${p.id}/verify`, { depositAccountId: sarAccount.id });
  assert.equal(bad.status, 400);
  await admin.ok('POST', `/admin/payments/${p.id}/reject`, { reason: 'Test clean-up' });
});

await step('a supplier billing in SAR: confirmed bookings post to its SAR payable at the rate', async () => {
  const [supplier] = await admin.ok('GET', '/admin/suppliers');
  const bad = await finance.call('PATCH', `/admin/suppliers/${supplier.id}/payable`, {
    payableAccountId: accounts.find((a) => a.systemKey === 'CASH').id,
  });
  assert.equal(bad.status, 400, 'an asset account is not a payable');
  const set = await finance.ok('PATCH', `/admin/suppliers/${supplier.id}/payable`, {
    payableAccountId: sarAccount.id,
  });
  assert.equal(set.payableAccount.currency, 'SAR');
  try {
    const before = await finance.ok('GET', `/admin/accounting/accounts/${sarAccount.id}/balance`);
    const groups = await partner.ok('GET', '/partner/groups?pageSize=50');
    const g = groups.items
      .filter((x) => x.seatsAvailable >= 1 && x.price)
      .sort((a, b) => a.price - b.price)[0];
    const quote = await partner.ok('POST', '/partner/quotes', { departureId: g.departureId, seats: 1 });
    const created = await partner.call('POST', '/partner/bookings', {
      quoteId: quote.id,
      acceptTerms: true,
      passengers: [
        {
          type: 'ADULT',
          title: 'MR',
          firstName: 'SAAD',
          lastName: 'KHAN',
          gender: 'MALE',
          dateOfBirth: '1990-01-01',
          nationality: 'PK',
          passportNumber: `FX${RUN}`,
          passportExpiry: '2032-01-01',
        },
      ],
    }, { 'idempotency-key': `erp-fx-${RUN}` });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const booking = created.body;
    await admin.ok('POST', `/admin/bookings/${booking.id}/approve`, {});
    const done = await admin.ok('POST', `/admin/bookings/${booking.id}/push`);
    assert.equal(done.status, 'CONFIRMED');
    const cost = done.priceAudit.supplierCost;
    assert.equal(cost.currency, 'SAR');
    assert.equal(cost.rate, 70);
    assert.equal(cost.amount, Math.round((done.priceAudit.supplierNetUnit / 70) * 100) / 100);
    const after = await finance.ok('GET', `/admin/accounting/accounts/${sarAccount.id}/balance`);
    const moved = Math.round((after.fcBalance - before.fcBalance) * 100) / 100;
    assert.equal(Math.abs(moved), cost.amount, `SAR payable moved by ${moved}`);
    const tb = await finance.ok('GET', '/admin/accounting/reports/trial-balance');
    assert.equal(tb.totalDebit, tb.totalCredit);
  } finally {
    await finance.ok('PATCH', `/admin/suppliers/${supplier.id}/payable`, { payableAccountId: null });
  }
});

// ---------- Partner team ----------

await step('agency owner adds a team member directly', async () => {
  const team = await partner.ok('POST', '/partner/team/members', {
    email: `agent.${RUN}@alnoor.test`,
    fullName: 'Bilal Agent',
    phone: '+923001112233',
    role: 'STAFF',
    password: 'Agent-temp-pass-1',
  });
  const m = team.members.find((x) => x.email === `agent.${RUN}@alnoor.test`);
  assert.equal(m.role, 'STAFF');
  const agent = client('partner');
  const s = await agent.login(`agent.${RUN}@alnoor.test`, 'Agent-temp-pass-1');
  assert.equal(s.session.user.mustChangePassword, true);
  assert.equal((await agent.call('GET', '/partner/bookings')).status, 403);
  await agent.ok('POST', '/auth/partner/set-password', {
    password: 'Morning-tide-789',
    confirmPassword: 'Morning-tide-789',
  });
  await agent.ok('GET', '/partner/bookings');
  // STAFF role cannot see payments (capability map)
  assert.equal((await agent.call('GET', '/partner/payments')).status, 403);
  await partner.ok('PATCH', `/partner/team/members/${m.userId}/status`, { status: 'DISABLED' });
  const again = client('partner');
  const r = await again.call('POST', '/auth/partner/login', {
    email: `agent.${RUN}@alnoor.test`,
    password: 'Morning-tide-789',
  });
  assert.equal(r.status, 403);
});

await step('admin manages the partner’s users', async () => {
  const me = await partner.ok('GET', '/auth/partner/me');
  const list = await admin.ok('GET', `/admin/partners/${me.account.accountId}/users`);
  assert.ok(list.users.some((u) => u.role === 'OWNER'));
  const after = await admin.ok('POST', `/admin/partners/${me.account.accountId}/users`, {
    email: `acct.${RUN}@alnoor.test`,
    fullName: 'Ayesha Accounts',
    phone: '+923004445566',
    role: 'ACCOUNTANT',
    mode: 'invite',
  });
  assert.ok(after.invites.some((i) => i.email === `acct.${RUN}@alnoor.test`));
});

// ---------- Booking desk ----------

await step('booking desk: take ownership and filter "mine"', async () => {
  const list = await admin.ok('GET', '/admin/bookings?pageSize=1');
  if (!list.items.length) return;
  const b = list.items[0];
  const detail = await admin.ok('PATCH', `/admin/bookings/${b.id}/assign`, {
    staffId: (await admin.ok('GET', '/auth/staff/me')).user.id,
  });
  assert.ok(detail.assignedTo);
  const mine = await admin.ok('GET', '/admin/bookings?owner=me');
  assert.ok(mine.items.some((x) => x.id === b.id));
  assert.ok(mine.items[0].statusSince);
});

await step('audit trail covers accounting and users', async () => {
  const a = await admin.ok('GET', '/admin/audit?action=voucher.approve');
  assert.ok(a.items.length >= 1);
  const u = await admin.ok('GET', '/admin/audit?action=staff.create');
  assert.ok(u.items.length >= 1);
});

console.log(`\n${passed} checks passed`);
