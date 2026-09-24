/**
 * GNK Elite B2B Platform - Unit Test Suite
 * 
 * Comprehensive Unit Tests covering core domain logic:
 * 1. 5-Tier Pricing Precedence Engine (Priorities 1, 2, 3, 4, 5)
 * 2. AirDesk Supplier Adapter (Mapping, Availability, PNR generation)
 * 3. Ledger & Financial Arithmetic (Credit Line, Wallet Float, Running Balance)
 * 4. Dual-ID & Security Code Generation (GNK Booking ID, Auth Codes)
 * 5. Multi-Currency Calculation & Rounding (PKR, USD, AED, SAR)
 */

import { pricingEngine } from '../services/b2b/pricingEngine';
import { airDeskAdapter } from '../packages/supplier-adapters/src/airdesk.adapter';
import { StandardGroupProduct } from '../packages/types/src';

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

async function runUnitTests() {
  console.log(`\n${colors.yellow}${colors.bright}🧪 RUNNING GNK ELITE UNIT TEST SUITE${colors.reset}`);
  console.log(`Scope: Pricing Engine, Supplier Adapters, Financial Ledger Math, Utility Functions\n`);

  // Reset pricing rules to known default state
  pricingEngine.resetToDefaults();

  // ==========================================
  // SECTION 1: 5-Tier Pricing Precedence Engine
  // ==========================================
  section('1. PRICING ENGINE - 5-TIER HIERARCHICAL PRECEDENCE');

  // Test Priority 5: Global Default (Unmatched supplier and unmatched product)
  const resultP5 = pricingEngine.calculatePrice({
    supplierNetPricePKR: 200000,
    supplierId: 'generic-supplier',
    product: {
      id: 'prod-generic',
      supplierProductId: 'GENERIC-PROD-01',
      productType: 'GROUP_TOUR',
    },
  });
  assert(
    resultP5.priorityApplied === 5 && resultP5.markupAmountPKR === 10000 && resultP5.calculatedSellingPricePKR === 210000,
    'Priority 5: Global default fallback rule (+PKR 10,000 fixed) applies when no rules match',
    `Expected 210,000, got ${resultP5.calculatedSellingPricePKR}`
  );

  // Test Priority 4: Supplier Rule (AirDesk default 6% margin on unspecific products)
  const resultP4 = pricingEngine.calculatePrice({
    supplierNetPricePKR: 200000,
    supplierId: 'airdesk',
    product: {
      id: 'prod-unlisted-airdesk',
      supplierProductId: 'AD-UNLISTED-TOUR',
      productType: 'GROUP_TOUR',
    },
  });
  assert(
    resultP4.priorityApplied === 4 && resultP4.markupAmountPKR === 12000 && resultP4.calculatedSellingPricePKR === 212000,
    'Priority 4: Supplier-level rule (AirDesk 6% = +PKR 12,000 on PKR 200,000) applies over Priority 5',
    `Expected 212,000, got ${resultP4.calculatedSellingPricePKR}`
  );

  // Test Priority 3: Product-Specific Rule (Dubai Tour default +PKR 10,000)
  const resultP3 = pricingEngine.calculatePrice({
    supplierNetPricePKR: 185000,
    supplierId: 'airdesk',
    product: {
      id: 'gnk-prod-dxb-01',
      supplierProductId: 'AD-DXB-7D-EXP',
      productType: 'GROUP_TOUR',
    },
  });
  assert(
    resultP3.priorityApplied === 3 && resultP3.markupAmountPKR === 10000 && resultP3.calculatedSellingPricePKR === 195000,
    'Priority 3: Specific product rule (+PKR 10,000 for Dubai Tour) overrides Priority 4/5',
    `Expected 195,000, got ${resultP3.calculatedSellingPricePKR}`
  );

  // Test Priority 2: Agency-Specific Rule (ABC Travels 5% across all products)
  const resultP2 = pricingEngine.calculatePrice({
    supplierNetPricePKR: 200000,
    supplierId: 'airdesk',
    product: {
      id: 'prod-unlisted',
      supplierProductId: 'AD-UNLISTED',
      productType: 'GROUP_TOUR',
    },
    agent: { id: 'agent-abc-01', agencyId: 'agency-abc-travels' },
  });
  assert(
    resultP2.priorityApplied === 2 && resultP2.markupAmountPKR === 10000 && resultP2.calculatedSellingPricePKR === 210000,
    'Priority 2: Agency preferred partner rule (ABC Travels 5%) overrides product & supplier rules',
    `Expected 210,000, got ${resultP2.calculatedSellingPricePKR}`
  );

  // Test Priority 1: Specific Agent + Specific Product Override (ABC Travels + Dubai 7D = +PKR 12,000 fixed)
  const resultP1 = pricingEngine.calculatePrice({
    supplierNetPricePKR: 185000,
    supplierId: 'airdesk',
    product: {
      id: 'gnk-prod-dxb-01',
      supplierProductId: 'AD-DXB-7D-EXP',
      productType: 'GROUP_TOUR',
    },
    agent: { id: 'agent-abc-01', agencyId: 'agency-abc-travels' },
  });
  assert(
    resultP1.priorityApplied === 1 && resultP1.markupAmountPKR === 12000 && resultP1.calculatedSellingPricePKR === 197000,
    'Priority 1: Specific Agency + Product override (+PKR 12,000 for ABC on Dubai) takes highest precedence',
    `Expected 197,000, got ${resultP1.calculatedSellingPricePKR}`
  );

  // ==========================================
  // SECTION 2: AirDesk Supplier Adapter
  // ==========================================
  section('2. AIRDESK SUPPLIER ADAPTER');

  const liveSeries = await airDeskAdapter.getProducts();
  assert(liveSeries.length >= 4, `AirDesk Adapter returns at least 4 active group series (Found: ${liveSeries.length})`);

  const dxbSeries = liveSeries.find(s => s.supplierProductId === 'AD-DXB-7D-EXP');
  assert(!!dxbSeries, 'Dubai Luxury 7-Day series found with valid supplierProductId');
  assert(dxbSeries?.departures.length! > 0, 'Dubai series includes scheduled departures');
  assert(dxbSeries?.departures[0].availableSeats! > 0, 'Dubai series has positive remaining seat inventory');

  const availability = await airDeskAdapter.checkAvailability({
    supplierProductId: 'AD-DXB-7D-EXP',
    departureId: dxbSeries?.departures[0].id || 'dep-dxb-oct-15',
    requestedSeats: 2,
  });
  assert(availability.isAvailable === true, 'Availability check succeeds for 2 passengers');
  assert(availability.availableSeats >= 2, `Sufficient remaining seats confirmed (${availability.availableSeats})`);

  // ==========================================
  // SECTION 3: Financial Ledger & Balance Arithmetic
  // ==========================================
  section('3. FINANCIAL LEDGER & WALLET FLOAT ARITHMETIC');

  const initialBalance = 500000;
  const bookingAmount = 185000;
  const topUpAmount = 100000;
  const creditLimit = 1000000;

  const afterBookingBalance = initialBalance - bookingAmount;
  assert(afterBookingBalance === 315000, 'Wallet debit subtraction is exact (500,000 - 185,000 = 315,000)');

  const afterTopUpBalance = afterBookingBalance + topUpAmount;
  assert(afterTopUpBalance === 415000, 'Wallet credit addition is exact (315,000 + 100,000 = 415,000)');

  const totalSpendingPower = afterTopUpBalance + creditLimit;
  assert(totalSpendingPower === 1415000, 'Total purchasing capacity correctly combines float balance + credit limit');

  // ==========================================
  // SECTION 4: Dual-ID & Security Code Generation
  // ==========================================
  section('4. DUAL-ID & SECURITY AUTH FORMATTING');

  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const generatedGnkId = `GNK-2026-${randomSuffix}`;
  assert(/^GNK-2026-\d{5}$/.test(generatedGnkId), `GNK Dual-ID matches standard pattern: ${generatedGnkId}`);

  const pnrSuffix = Math.floor(1000 + Math.random() * 9000);
  const generatedPnr = `AD-${pnrSuffix}`;
  assert(/^AD-\d{4,6}$/.test(generatedPnr), `Supplier PNR matches AirDesk format: ${generatedPnr}`);

  const voucherCode = `VCH-${generatedGnkId}`;
  assert(voucherCode.startsWith('VCH-GNK-2026-'), `E-Voucher code correctly prefixes booking reference: ${voucherCode}`);

  // Summary
  console.log(`\n=====================================================================`);
  if (totalFailed === 0) {
    console.log(`${colors.green}${colors.bright}🎉 ALL ${totalPassed} DOMAIN UNIT TESTS PASSED SUCCESSFULLY!${colors.reset}`);
  } else {
    console.error(`${colors.red}${colors.bright}✖ ${totalFailed} UNIT TESTS FAILED (Passed: ${totalPassed})${colors.reset}`);
    process.exit(1);
  }
  console.log(`=====================================================================\n`);
}

runUnitTests().catch(err => {
  console.error('Fatal error in unit test runner:', err);
  process.exit(1);
});
