#!/usr/bin/env node
// Module-coverage e2e against a seeded API. Complements smoke.mjs / erp.mjs.
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const need = (k) => process.env[k] ?? (console.error(`Set ${k}`), process.exit(2));
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:3001';

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
  const call = async (method, path, body) => {
    const res = await fetch(API + path, {
      method,
      headers: {
        origin: ORIGIN,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  return {
    call,
    async login(email, password) {
      const r = await call('POST', `/auth/${realm}/login`, { email, password });
      assert.equal(r.status, 200, `login failed: ${JSON.stringify(r.body)}`);
      token = r.body.accessToken;
    },
  };
}

const partner = client('partner');
const admin = client('staff');

console.log(`GNK Connect module e2e → ${API}\n`);

await step('sign in', async () => {
  await partner.login(need('PARTNER_EMAIL'), need('PARTNER_PASSWORD'));
  await admin.login(need('ADMIN_EMAIL'), need('ADMIN_PASSWORD'));
});

await step('health and public catalog', async () => {
  const h = await fetch(`${API}/health`).then((r) => r.json());
  assert.equal(h.status, 'ok');
  const g = await fetch(`${API}/public/groups`).then((r) => r.json());
  assert.ok(Array.isArray(g.items));
});

await step('partner dashboard, notifications, settings, team', async () => {
  assert.equal((await partner.call('GET', '/partner/dashboard')).status, 200);
  assert.equal((await partner.call('GET', '/partner/notifications')).status, 200);
  assert.equal((await partner.call('GET', '/partner/notifications/preferences')).status, 200);
  assert.equal((await partner.call('GET', '/partner/payment-instructions')).status, 200);
  assert.equal((await partner.call('GET', '/partner/account')).status, 200);
  assert.equal((await partner.call('GET', '/partner/team')).status, 200);
  assert.equal((await partner.call('GET', '/partner/groups/filters')).status, 200);
});

await step('admin queues, catalog, pricing, suppliers, staff, settings', async () => {
  assert.equal((await admin.call('GET', '/admin/queues')).status, 200);
  assert.equal((await admin.call('GET', '/admin/dashboard')).status, 200);
  assert.equal((await admin.call('GET', '/admin/catalog/products')).status, 200);
  assert.equal((await admin.call('GET', '/admin/catalog/options')).status, 200);
  assert.equal((await admin.call('GET', '/admin/pricing/rules')).status, 200);
  assert.equal((await admin.call('GET', '/admin/pricing/tiers')).status, 200);
  assert.equal((await admin.call('GET', '/admin/suppliers')).status, 200);
  assert.equal((await admin.call('GET', '/admin/staff')).status, 200);
  assert.equal((await admin.call('GET', '/admin/roles')).status, 200);
  assert.equal((await admin.call('GET', '/admin/settings')).status, 200);
  assert.equal((await admin.call('GET', '/admin/accounting/accounts')).status, 200);
  assert.equal((await admin.call('GET', '/admin/accounting/currencies')).status, 200);
  assert.equal((await admin.call('GET', '/admin/accounting/periods')).status, 200);
  assert.equal((await admin.call('GET', '/admin/partners?page=1')).status, 200);
  assert.equal((await admin.call('GET', '/admin/audit?page=1')).status, 200);
});

await step('unauthenticated write is rejected', async () => {
  const r = await fetch(`${API}/admin/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.ok(r.status === 401 || r.status === 403);
});

console.log(`\n${passed} module checks passed`);
