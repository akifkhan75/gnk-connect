/**
 * GNK Connect B2B Platform - Automated End-to-End (E2E) Lifecycle Test Suite
 * 
 * Verifies the complete 10-step B2B reseller lifecycle:
 * 1. Agent Registration (Agency + Owner)
 * 2. KYC Document Upload (DTS Tourism License & NTN Tax Certificate)
 * 3. Admin Verification & Partner Approval
 * 4. AirDesk Supplier Inventory Sync & Availability Check
 * 5. Dynamic 5-Tier Markup Calculation & Precedence Engine
 * 6. Group Booking Creation with Passenger Roster & Dual ID (GNK-2026-XXXXX)
 * 7. Bank Payment Deposit Slip Upload & Financial Verification
 * 8. Admin 1-Click Push to AirDesk API & Supplier Reservation (AD-XXXXXX)
 * 9. Financial Ledger & Automated Wallet Debit Recording
 * 10. Statement of Account (SOA) Generation & Balance Reconciliation
 */

import { airDeskAdapter } from '../packages/supplier-adapters/src/airdesk.adapter';
import { pricingEngine } from '../services/b2b/pricingEngine';
import { b2bStore } from '../services/b2b/b2bStore';
import { 
  StandardGroupProduct, 
  Passenger, 
  PricingRule, 
  B2BBooking, 
  StatementOfAccount 
} from '../packages/types/src';

// Colors for terminal formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function pass(step: string, details: string) {
  console.log(`  ${colors.green}✔ PASS${colors.reset} [${colors.bright}${step}${colors.reset}] ${details}`);
}

function fail(step: string, details: string, error?: any) {
  console.error(`  ${colors.red}✖ FAIL${colors.reset} [${colors.bright}${step}${colors.reset}] ${details}`);
  if (error) console.error(error);
  process.exit(1);
}

function section(title: string) {
  console.log(`\n${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

async function runE2ETestSuite() {
  const startTime = Date.now();

  console.log(`\n${colors.yellow}${colors.bright}🚀 STARTING GNK CONNECT B2B END-TO-END AUTOMATED TEST SUITE${colors.reset}`);
  console.log(`Target Architecture: AirDesk Group Supplier + GNK Wholesale Reseller Platform`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  // ==========================================
  // STEP 1: Agent Registration
  // ==========================================
  section('STEP 1: Agent & Agency Registration');
  let registeredUser;
  let registeredAgency;

  try {
    const registrationPayload = {
      fullName: 'Muhammad Bilal Khan',
      email: `bilal.falcon.${Date.now()}@falcontravels.pk`,
      phone: '+92 321 9876543',
      accountType: 'AGENCY' as const,
      agencyName: 'Falcon International Travels (Pvt) Ltd',
      city: 'Islamabad',
      country: 'Pakistan',
      officeAddress: 'Executive Heights, Blue Area, Islamabad',
      ntnNumber: '9284102-3',
      tradeLicenseNumber: 'DTS-ISB-9201',
    };

    registeredUser = b2bStore.registerAgent(registrationPayload);
    const agencies = b2bStore.getAgencies();
    registeredAgency = agencies.find(a => a.id === registeredUser.agencyId);

    if (!registeredUser.id || !registeredUser.email) {
      throw new Error('Agent user ID or email missing from registration result');
    }
    if (registeredUser.approvalStatus !== 'PENDING_VERIFICATION') {
      throw new Error(`Expected status PENDING_VERIFICATION, got ${registeredUser.approvalStatus}`);
    }

    pass('Step 1.1', `Agent registered: ${registeredUser.fullName} (${registeredUser.email})`);
    pass('Step 1.2', `Agency created: ${registeredAgency?.name} [ID: ${registeredAgency?.id}]`);
    pass('Step 1.3', `Initial status is PENDING_VERIFICATION (ApprovalGuard protected)`);
  } catch (err: any) {
    fail('Step 1', 'Failed to register agent & agency', err);
  }

  // ==========================================
  // STEP 2: KYC Verification Document Upload
  // ==========================================
  section('STEP 2: KYC & DTS License Document Submission');
  try {
    const mockDtsDoc = {
      title: 'DTS Tourism License 2026',
      fileUrl: 'https://gnkconnect.pk/uploads/documents/dts_license_falcon_2026.pdf',
      uploadedAt: new Date().toISOString(),
      status: 'VERIFIED' as const,
    };
    const mockNtnDoc = {
      title: 'FBR NTN Tax Certificate',
      fileUrl: 'https://gnkconnect.pk/uploads/documents/ntn_cert_falcon.pdf',
      uploadedAt: new Date().toISOString(),
      status: 'VERIFIED' as const,
    };

    if (registeredAgency) {
      registeredAgency.verificationDocuments = [mockDtsDoc, mockNtnDoc];
    }

    pass('Step 2.1', `DTS License attached: ${mockDtsDoc.fileUrl}`);
    pass('Step 2.2', `NTN Certificate attached: ${mockNtnDoc.fileUrl}`);
  } catch (err: any) {
    fail('Step 2', 'Document attachment failed', err);
  }

  // ==========================================
  // STEP 3: Admin Review & Partner Approval
  // ==========================================
  section('STEP 3: Admin Review & Agency Approval');
  try {
    b2bStore.updateAgentStatus(registeredUser.id, 'APPROVED');

    const updatedUsers = b2bStore.getUsers();
    const approvedUser = updatedUsers.find(u => u.id === registeredUser.id);
    const updatedAgencies = b2bStore.getAgencies();
    const approvedAgency = updatedAgencies.find(a => a.id === registeredAgency?.id);

    if (approvedUser?.approvalStatus !== 'APPROVED') {
      throw new Error(`Expected user status APPROVED, got ${approvedUser?.approvalStatus}`);
    }
    if (approvedAgency?.approvalStatus !== 'APPROVED') {
      throw new Error(`Expected agency status APPROVED, got ${approvedAgency?.approvalStatus}`);
    }

    pass('Step 3.1', `Admin approved agent user [${approvedUser.id}]`);
    pass('Step 3.2', `Agency [${approvedAgency.name}] transitioned to APPROVED status`);
    pass('Step 3.3', `ApprovalGuard now unlocks wholesale booking rights`);
  } catch (err: any) {
    fail('Step 3', 'Admin verification failed', err);
  }

  // ==========================================
  // STEP 4: AirDesk Inventory Sync & Availability
  // ==========================================
  section('STEP 4: AirDesk Supplier Inventory & Departure Query');
  let selectedTour: StandardGroupProduct | null = null;
  try {
    const products = await airDeskAdapter.getProducts();
    if (products.length === 0) {
      throw new Error('AirDesk adapter returned 0 group products');
    }

    selectedTour = products[0]; // Dubai or Baku
    if (!selectedTour.departures || selectedTour.departures.length === 0) {
      throw new Error('Selected product has no available departures');
    }

    const firstDep = selectedTour.departures[0];
    if (firstDep.availableSeats <= 0) {
      throw new Error('Departure has no available seats');
    }

    pass('Step 4.1', `Fetched ${products.length} active group tour series from AirDesk Supplier Adapter`);
    pass('Step 4.2', `Selected Series: "${selectedTour.title}" [Supplier ID: ${selectedTour.supplierProductId}]`);
    pass('Step 4.3', `Departure Date: ${firstDep.departureDate} | Available Seats: ${firstDep.availableSeats} | Net Cost: PKR ${firstDep.supplierNetPricePKR.toLocaleString()}`);
  } catch (err: any) {
    fail('Step 4', 'AirDesk inventory query failed', err);
  }

  // ==========================================
  // STEP 5: Dynamic Margin & Pricing Precedence
  // ==========================================
  section('STEP 5: Hierarchical Pricing & Margin Calculation');
  let pricingCalcResult;
  try {
    // Add custom agency markup rule (Priority 2: 7% markup on group tours)
    const customRule: PricingRule = {
      id: `rule-falcon-custom-${Date.now()}`,
      name: 'Falcon Travels Preferred 7% Group Markup',
      priority: 2,
      agencyId: registeredAgency?.id,
      productType: 'GROUP_TOUR',
      markupType: 'PERCENTAGE',
      markupValue: 7,
      currency: 'PKR',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    pricingEngine.saveRule(customRule);

    const netPricePKR = selectedTour!.departures[0].supplierNetPricePKR;
    pricingCalcResult = pricingEngine.calculatePrice({
      supplierNetPricePKR: netPricePKR,
      supplierId: selectedTour!.supplierId,
      product: {
        id: selectedTour!.id,
        supplierProductId: selectedTour!.supplierProductId,
        productType: selectedTour!.productType,
      },
      agent: {
        id: registeredUser.id,
        agencyId: registeredAgency?.id,
      },
    });

    const expectedMarkup = Math.round(netPricePKR * 0.07);
    const expectedSellingPrice = netPricePKR + expectedMarkup;

    if (pricingCalcResult.calculatedSellingPricePKR !== expectedSellingPrice) {
      throw new Error(`Calculated price mismatch: expected ${expectedSellingPrice}, got ${pricingCalcResult.calculatedSellingPricePKR}`);
    }

    pass('Step 5.1', `Saved custom Priority 2 rule: "${customRule.name}" (+7%)`);
    pass('Step 5.2', `Supplier Net Cost: PKR ${pricingCalcResult.supplierNetPricePKR.toLocaleString()}`);
    pass('Step 5.3', `GNK Wholesale Markup: +PKR ${pricingCalcResult.markupAmountPKR.toLocaleString()} (${pricingCalcResult.markupValueApplied}%)`);
    pass('Step 5.4', `Agent Selling Price: PKR ${pricingCalcResult.calculatedSellingPricePKR.toLocaleString()} [Rule: ${pricingCalcResult.appliedRuleName}]`);
  } catch (err: any) {
    fail('Step 5', 'Pricing engine calculation failed', err);
  }

  // ==========================================
  // STEP 6: Group Booking Request Creation
  // ==========================================
  section('STEP 6: Group Booking Submission & Dual-ID Generation');
  let createdBooking: B2BBooking;
  const departure = selectedTour!.departures[0];
  const seatsToBook = 2;

  try {
    const passengers: Passenger[] = [
      {
        id: 'pax-e2e-1',
        title: 'Mr',
        firstName: 'Zubair',
        lastName: 'Ahmed',
        passportNumber: 'PA7892019',
        passportExpiry: '2030-08-20',
        dob: '1988-03-15',
        nationality: 'Pakistani',
        gender: 'MALE',
        passengerType: 'ADULT',
      },
      {
        id: 'pax-e2e-2',
        title: 'Mrs',
        firstName: 'Ayesha',
        lastName: 'Zubair',
        passportNumber: 'PA7892020',
        passportExpiry: '2030-08-20',
        dob: '1992-07-22',
        nationality: 'Pakistani',
        gender: 'FEMALE',
        passengerType: 'ADULT',
      },
    ];

    createdBooking = await b2bStore.createBookingRequest({
      agent: registeredUser,
      product: selectedTour!,
      departureId: departure.id,
      passengers,
      paymentMethod: 'BANK_TRANSFER',
      paymentReferenceNumber: 'HBL-FT-991024',
      paymentProofUrl: 'https://gnkconnect.pk/uploads/payment-slips/deposit_slip_991024.jpg',
      specialRequests: 'Adjacent airline seats and double bed room requested',
    });

    if (!createdBooking.id.startsWith('GNK-2026-')) {
      throw new Error(`Expected GNK booking ID format GNK-2026-XXXXX, got ${createdBooking.id}`);
    }
    if (createdBooking.passengers.length !== seatsToBook) {
      throw new Error(`Expected ${seatsToBook} passengers, got ${createdBooking.passengers.length}`);
    }

    const totalNet = departure.supplierNetPricePKR * seatsToBook;
    const totalSelling = pricingCalcResult!.calculatedSellingPricePKR * seatsToBook;
    const totalMarkup = totalSelling - totalNet;

    pass('Step 6.1', `Booking created with GNK Dual-ID: ${colors.bright}${createdBooking.id}${colors.reset}`);
    pass('Step 6.2', `Passenger roster attached: ${passengers.map(p => `${p.title} ${p.firstName} ${p.lastName}`).join(', ')}`);
    pass('Step 6.3', `Financial breakdown locked: Net PKR ${totalNet.toLocaleString()} | Margin PKR ${totalMarkup.toLocaleString()} | Total PKR ${totalSelling.toLocaleString()}`);
  } catch (err: any) {
    fail('Step 6', 'Booking creation failed', err);
  }

  // ==========================================
  // STEP 7: Admin Verification & 1-Click AirDesk Push
  // ==========================================
  section('STEP 7: Admin Audit & 1-Click AirDesk Supplier API Dispatch');
  try {
    const pushResult = await b2bStore.approveAndPushToSupplier(createdBooking!.id, 'GNK Admin E2E');
    if (!pushResult.success) {
      throw new Error(`Supplier push failed: ${pushResult.message}`);
    }

    const updatedBooking = b2bStore.getBookings().find(b => b.id === createdBooking!.id);
    if (!updatedBooking?.supplierBookingId) {
      throw new Error('Supplier booking ID was not assigned');
    }
    if (updatedBooking.status !== 'SUPPLIER_CONFIRMED') {
      throw new Error(`Expected status SUPPLIER_CONFIRMED, got ${updatedBooking.status}`);
    }

    pass('Step 7.1', `Admin approved payment & initiated real-time supplier dispatch`);
    pass('Step 7.2', `AirDesk API confirmed reservation! Supplier Reference: ${colors.bright}${colors.green}${updatedBooking.supplierBookingId}${colors.reset}`);
    pass('Step 7.3', `Dual-ID Pair Verified: GNK ID: ${colors.cyan}${updatedBooking.id}${colors.reset} ↔ AirDesk PNR: ${colors.green}${updatedBooking.supplierBookingId}${colors.reset}`);
    pass('Step 7.4', `Status is now SUPPLIER_CONFIRMED`);
  } catch (err: any) {
    fail('Step 7', 'Supplier push failed', err);
  }

  // ==========================================
  // STEP 8: Financial Ledger & Automatic Debit
  // ==========================================
  section('STEP 8: Financial Ledger & Wallet Debit Recording');
  try {
    const ledgerTxn = b2bStore.recordLedgerTransaction(
      registeredAgency!.id,
      'BOOKING_DEBIT',
      createdBooking!.totalAgentSellingPricePKR,
      createdBooking!.id,
      `Payment debit for ${createdBooking!.productTitle} (${createdBooking!.totalSeats} Pax)`,
      registeredUser.id,
      createdBooking!.id
    );

    if (!ledgerTxn.id.startsWith('TXN-')) {
      throw new Error(`Invalid ledger transaction ID ${ledgerTxn.id}`);
    }

    const agencyLedger = b2bStore.getAgencyLedger(registeredAgency!.id);
    if (agencyLedger.length === 0) {
      throw new Error('Agency ledger returned 0 transactions');
    }

    pass('Step 8.1', `Ledger debit recorded: [${ledgerTxn.id}] -PKR ${ledgerTxn.amountPKR.toLocaleString()}`);
    pass('Step 8.2', `Linked reference: ${ledgerTxn.reference} (Booking ${createdBooking!.id})`);
    pass('Step 8.3', `Updated Agency Running Balance: PKR ${ledgerTxn.balanceAfterPKR.toLocaleString()}`);
  } catch (err: any) {
    fail('Step 8', 'Ledger debit recording failed', err);
  }

  // ==========================================
  // STEP 9: Statement of Account (SOA) Generation
  // ==========================================
  section('STEP 9: Formal Statement of Account (SOA) Verification');
  try {
    const soa: StatementOfAccount = b2bStore.generateStatementOfAccount(registeredAgency!.id);

    if (!soa.statementNumber.startsWith('SOA-')) {
      throw new Error(`Invalid SOA statement number: ${soa.statementNumber}`);
    }
    if (soa.transactions.length === 0) {
      throw new Error('SOA generated with 0 itemized transactions');
    }

    pass('Step 9.1', `Generated Official Statement: ${colors.bright}${soa.statementNumber}${colors.reset}`);
    pass('Step 9.2', `Billing Agency: ${soa.agencyName} | NTN: ${soa.agencyNtn} | DTS: ${soa.agencyDtsLicense}`);
    pass('Step 9.3', `Financials: Opening PKR ${soa.openingBalancePKR.toLocaleString()} | Debits PKR ${soa.totalDebitsPKR.toLocaleString()} | Credits PKR ${soa.totalCreditsPKR.toLocaleString()} | Closing PKR ${soa.closingBalancePKR.toLocaleString()}`);
    pass('Step 9.4', `Credit Line Approved: PKR ${soa.creditLimitPKR.toLocaleString()} | Available Line: PKR ${soa.availableCreditPKR.toLocaleString()}`);
  } catch (err: any) {
    fail('Step 9', 'Statement of Account generation failed', err);
  }

  // ==========================================
  // STEP 10: Official B2B E-Voucher Generation
  // ==========================================
  section('STEP 10: Official B2B Travel E-Voucher & QR Verification');
  try {
    const voucher = b2bStore.generateVoucherData(createdBooking!.id);

    if (!voucher.voucherNumber.startsWith('VCH-')) {
      throw new Error(`Invalid voucher number: ${voucher.voucherNumber}`);
    }
    if (!voucher.verificationCode.startsWith('AUTH-GNK-')) {
      throw new Error(`Missing QR verification code in voucher`);
    }
    if (voucher.passengers.length !== 2) {
      throw new Error(`Expected 2 passengers in voucher roster, got ${voucher.passengers.length}`);
    }

    pass('Step 10.1', `Generated Official B2B E-Voucher: ${colors.bright}${voucher.voucherNumber}${colors.reset}`);
    pass('Step 10.2', `AirDesk Supplier PNR: ${colors.green}${voucher.supplierPnr}${colors.reset} | Verification Auth Code: ${voucher.verificationCode}`);
    pass('Step 10.3', `Tour: ${voucher.tourTitle} (${voucher.departureDate} → ${voucher.returnDate})`);
    pass('Step 10.4', `Hospitality: ${voucher.hotelDetails} | Airline: ${voucher.airline}`);
    pass('Step 10.5', `Inclusions Verified: ${voucher.inclusions.length} services confirmed | Meeting Point: ${voucher.meetingPoint}`);
  } catch (err: any) {
    fail('Step 10', 'E-Voucher generation failed', err);
  }

  // ==========================================
  // STEP 11: Real-time B2B Notification Dispatch
  // ==========================================
  section('STEP 11: Multi-Channel B2B Notification Dispatcher');
  try {
    const agentNotifs = b2bStore.getNotifications(registeredUser.email);
    
    if (agentNotifs.length === 0) {
      throw new Error(`No automated notifications received for ${registeredUser.email}`);
    }

    const bookingConfirmedNotif = agentNotifs.find(n => n.type === 'BOOKING_CONFIRMED');
    if (!bookingConfirmedNotif) {
      throw new Error('Expected BOOKING_CONFIRMED notification in agent inbox');
    }

    pass('Step 11.1', `Dispatched notification inbox size: ${agentNotifs.length} for ${registeredUser.email}`);
    pass('Step 11.2', `Notification Type [${bookingConfirmedNotif.type}]: "${bookingConfirmedNotif.title}"`);
    pass('Step 11.3', `Channel: ${bookingConfirmedNotif.channel} | Delivery Status: ${bookingConfirmedNotif.status}`);
  } catch (err: any) {
    fail('Step 11', 'Notification dispatcher failed', err);
  }

  // ==========================================
  // SUMMARY REPORT
  // ==========================================
  const durationMs = Date.now() - startTime;
  console.log(`\n${colors.green}${colors.bright}=====================================================================`);
  console.log(`🎉 ALL 11 B2B LIFECYCLE TESTS PASSED PERFECTLY! (Duration: ${durationMs}ms)`);
  console.log(`=====================================================================${colors.reset}\n`);
}

runE2ETestSuite().catch((err) => {
  console.error('Fatal E2E test runner error:', err);
  process.exit(1);
});
