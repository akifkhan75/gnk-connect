/**
 * GNK Connect B2B Platform - API Integration Test Suite
 * 
 * Verifies live containerized API integration:
 * 1. Health & Static Upload Endpoint Integration
 * 2. Public AirDesk Products & Inventory Query
 * 3. JWT Authentication & Protected Access Controls
 * 4. 5-Tier Pricing Engine API Calculation
 * 5. Agency Directory & Partner KYC State
 * 6. Financial Ledger Summary API
 */

const API_BASE = process.env.API_URL || 'http://localhost:4010/api/v1';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`  ${colors.green}✔ PASS${colors.reset} ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ${colors.red}✖ FAIL${colors.reset} ${testName} - ${errorDetail || 'Assertion failed'}`);
    totalFailed++;
  }
}

function section(title: string) {
  console.log(`\n${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

async function runApiIntegrationTests() {
  console.log(`\n${colors.yellow}${colors.bright}🌐 RUNNING GNK CONNECT API INTEGRATION TEST SUITE${colors.reset}`);
  console.log(`Target URL: ${API_BASE}\n`);

  // ==========================================
  // SECTION 1: Health & File Server
  // ==========================================
  section('1. SYSTEM HEALTH & STORAGE INTEGRATION');
  try {
    const healthRes = await fetch(`${API_BASE}/uploads/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, `Health endpoint returns 200 OK (${healthRes.status})`);
    assert(healthData.status === 'ONLINE', `Storage engine is ONLINE (${healthData.storageType})`);
    assert(Array.isArray(healthData.supportedMimes), 'Supported MIME types array is populated');
  } catch (err: any) {
    assert(false, 'Health endpoint reachable', err.message);
  }

  // ==========================================
  // SECTION 2: AirDesk Supplier Inventory Sync
  // ==========================================
  section('2. AIRDESK SUPPLIER INVENTORY SYNC INTEGRATION');
  try {
    const prodRes = await fetch(`${API_BASE}/suppliers/products`);
    const products = await prodRes.json();
    assert(prodRes.status === 200, `Products endpoint returns 200 OK (${prodRes.status})`);
    assert(Array.isArray(products) && products.length >= 4, `AirDesk products synced to DB (Found: ${products.length})`);
    
    const dxb = products.find((p: any) => p.supplierProductId === 'AD-DXB-7D-EXP');
    assert(!!dxb, 'Dubai Luxury 7-Day product present with live departures');
    assert(dxb?.departures?.length > 0, `Departures synced (${dxb?.departures?.length} scheduled departures)`);
  } catch (err: any) {
    assert(false, 'Products endpoint query', err.message);
  }

  // ==========================================
  // SECTION 3: JWT Authentication & Access Control
  // ==========================================
  section('3. JWT AUTHENTICATION & ACCESS CONTROL');
  let token = '';
  try {
    // 3.1 Invalid login rejection
    const badLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gnkconnect.pk', password: 'wrongpassword' }),
    });
    assert(badLoginRes.status === 401, 'Invalid credentials rejected with 401 Unauthorized');

    // 3.2 Valid login
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gnkconnect.pk', password: 'admin123' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 201 || loginRes.status === 200, `Admin login successful (${loginRes.status})`);
    assert(!!loginData.accessToken, 'JWT Access Token issued');
    assert(loginData.user?.role === 'GNK_ADMIN', `User authenticated as GNK_ADMIN`);
    token = loginData.accessToken;
  } catch (err: any) {
    assert(false, 'Auth flow integration', err.message);
  }

  // ==========================================
  // SECTION 4: Dynamic Pricing API Integration
  // ==========================================
  section('4. DYNAMIC PRICING CALCULATION API');
  try {
    const calcRes = await fetch(`${API_BASE}/pricing/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        supplierNetPricePKR: 185000,
        supplierId: 'airdesk',
        product: {
          id: 'gnk-prod-dxb-01',
          supplierProductId: 'AD-DXB-7D-EXP',
          productType: 'GROUP_TOUR',
        },
        agent: {
          id: 'user-abc-owner',
          agencyId: 'agency-abc-travels',
        },
      }),
    });
    const calcData = await calcRes.json();
    assert(calcRes.status === 200 || calcRes.status === 201, `Pricing calculation returns 200 OK (${calcRes.status})`);
    assert(calcData.priorityApplied === 1, `Priority 1 rule applied (${calcData.appliedRuleName})`);
    assert(calcData.markupAmountPKR === 12000, `Markup amount matches rule (+PKR 12,000)`);
    assert(calcData.calculatedSellingPricePKR === 197000, `Total selling price matches 185,000 + 12,000 = 197,000 PKR`);
  } catch (err: any) {
    assert(false, 'Pricing calculation endpoint', err.message);
  }

  // ==========================================
  // SECTION 5: Agency Directory & Ledger Summary
  // ==========================================
  section('5. AGENCIES DIRECTORY & FINANCIAL LEDGER SUMMARY');
  try {
    const agenciesRes = await fetch(`${API_BASE}/agents/agencies`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const agencies = await agenciesRes.json();
    assert(agenciesRes.status === 200, `Agencies endpoint returns 200 OK (${agenciesRes.status})`);
    assert(Array.isArray(agencies) && agencies.length > 0, `Active registered agencies list returned (Count: ${agencies.length})`);

    const ledgerRes = await fetch(`${API_BASE}/ledger/admin/summary`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const ledgerData = await ledgerRes.json();
    assert(ledgerRes.status === 200, `Ledger summary endpoint returns 200 OK (${ledgerRes.status})`);
    assert(typeof ledgerData.grossBookingsVolumePKR === 'number', `Gross booking volume tracked: PKR ${ledgerData.grossBookingsVolumePKR.toLocaleString()}`);
    assert(typeof ledgerData.retainedGnkMarginPKR === 'number', `Retained margin tracked: PKR ${ledgerData.retainedGnkMarginPKR.toLocaleString()}`);
  } catch (err: any) {
    assert(false, 'Agencies & Ledger API query', err.message);
  }

  // Summary
  console.log(`\n=====================================================================`);
  if (totalFailed === 0) {
    console.log(`${colors.green}${colors.bright}🎉 ALL ${totalPassed} API INTEGRATION TESTS PASSED!${colors.reset}`);
  } else {
    console.error(`${colors.red}${colors.bright}✖ ${totalFailed} INTEGRATION TESTS FAILED (Passed: ${totalPassed})${colors.reset}`);
    process.exit(1);
  }
  console.log(`=====================================================================\n`);
}

runApiIntegrationTests().catch(err => {
  console.error('Fatal error in API integration test runner:', err);
  process.exit(1);
});
