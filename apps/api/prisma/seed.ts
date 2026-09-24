import { PrismaClient, SupplierType, SupplierStatus, ProductType, AgentRole, AgentAccountType, ApprovalStatus, MarkupType, GNKBookingStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = 'gnk_connect_static_salt_v1';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

async function main() {
  console.log('🌱 Starting GNK Connect database seed...');

  // 1. Seed Supplier: AirDesk Groups API
  const airdeskSupplier = await prisma.supplier.upsert({
    where: { code: 'airdesk' },
    update: {},
    create: {
      id: 'sup-airdesk-01',
      code: 'airdesk',
      name: 'AirDesk Groups API Engine',
      type: SupplierType.AIRDESK,
      status: SupplierStatus.ACTIVE,
      apiVersion: 'v2.4',
      apiEndpoint: 'https://api.airdesk.travel/v2',
      syncIntervalMinutes: 15,
      lastSyncAt: new Date()
    }
  });
  console.log(`✅ Seeded Supplier: ${airdeskSupplier.name}`);

  // 2. Seed Agencies
  const abcAgency = await prisma.agency.upsert({
    where: { officialEmail: 'info@abctravels.com.pk' },
    update: {},
    create: {
      id: 'agency-abc-travels',
      name: 'ABC Travels & Tours',
      tradeLicenseNumber: 'DTS-KHI-4920',
      ntnNumber: '7392810-4',
      city: 'Karachi',
      country: 'Pakistan',
      officeAddress: 'Suite 402, Business Avenue, Shahrah-e-Faisal, Karachi',
      phone: '+92 21 34567890',
      officialEmail: 'info@abctravels.com.pk',
      approvalStatus: ApprovalStatus.APPROVED,
      creditLimitPKR: 1500000,
      walletBalancePKR: 450000,
      documents: {
        create: [
          { title: 'DTS Tourism License', fileUrl: 'https://example.com/docs/dts.pdf', status: 'VERIFIED' },
          { title: 'FBR NTN Certificate', fileUrl: 'https://example.com/docs/ntn.pdf', status: 'VERIFIED' }
        ]
      }
    }
  });

  const alHaramAgency = await prisma.agency.upsert({
    where: { officialEmail: 'contact@alharamhajj.com' },
    update: {},
    create: {
      id: 'agency-al-haram',
      name: 'Al-Haram Hajj & Umrah Services',
      tradeLicenseNumber: 'DTS-LHR-8812',
      ntnNumber: '5819203-1',
      city: 'Lahore',
      country: 'Pakistan',
      officeAddress: 'Plaza 14, Main Boulevard, Gulberg III, Lahore',
      phone: '+92 42 35789012',
      officialEmail: 'contact@alharamhajj.com',
      approvalStatus: ApprovalStatus.APPROVED,
      creditLimitPKR: 2000000,
      walletBalancePKR: 850000
    }
  });
  console.log('✅ Seeded Agencies: ABC Travels, Al-Haram Hajj & Umrah');

  // 3. Seed Users
  await prisma.agentUser.upsert({
    where: { email: 'agent@abctravels.com' },
    update: {},
    create: {
      id: 'user-abc-owner',
      email: 'agent@abctravels.com',
      passwordHash: hashPassword('partner123'),
      fullName: 'Tariq Mansoor',
      phone: '+92 300 1234567',
      role: AgentRole.AGENCY_OWNER,
      accountType: AgentAccountType.AGENCY,
      approvalStatus: ApprovalStatus.APPROVED,
      agencyId: abcAgency.id,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
    }
  });

  await prisma.agentUser.upsert({
    where: { email: 'tours@alharam.com' },
    update: {},
    create: {
      id: 'user-alharam-owner',
      email: 'tours@alharam.com',
      passwordHash: hashPassword('partner123'),
      fullName: 'Sheikh Bilal Ahmed',
      phone: '+92 321 9876543',
      role: AgentRole.AGENCY_OWNER,
      accountType: AgentAccountType.AGENCY,
      approvalStatus: ApprovalStatus.APPROVED,
      agencyId: alHaramAgency.id,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop'
    }
  });

  await prisma.agentUser.upsert({
    where: { email: 'muhammad.ali.travels@gmail.com' },
    update: {},
    create: {
      id: 'user-muhammad-ali',
      email: 'muhammad.ali.travels@gmail.com',
      passwordHash: hashPassword('partner123'),
      fullName: 'Muhammad Ali',
      phone: '+92 333 5551234',
      role: AgentRole.INDIVIDUAL_AGENT,
      accountType: AgentAccountType.INDIVIDUAL,
      approvalStatus: ApprovalStatus.PENDING_VERIFICATION,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop'
    }
  });

  await prisma.agentUser.upsert({
    where: { email: 'admin@gnkconnect.pk' },
    update: {},
    create: {
      id: 'user-gnk-admin',
      email: 'admin@gnkconnect.pk',
      passwordHash: hashPassword('admin123'),
      fullName: 'GNK Operations Admin',
      phone: '+92 300 0000001',
      role: AgentRole.GNK_ADMIN,
      accountType: AgentAccountType.AGENCY,
      approvalStatus: ApprovalStatus.APPROVED,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop'
    }
  });
  console.log('✅ Seeded Agent Users & GNK Admin');

  // 4. Seed AirDesk Group Products & Departures
  const dxbProduct = await prisma.product.upsert({
    where: {
      supplierId_supplierProductId: {
        supplierId: airdeskSupplier.id,
        supplierProductId: 'AD-DXB-7D-EXP'
      }
    },
    update: {},
    create: {
      id: 'gnk-prod-dxb-01',
      supplierId: airdeskSupplier.id,
      supplierProductId: 'AD-DXB-7D-EXP',
      supplierProductCode: 'DXB-LUX-2026',
      productType: ProductType.GROUP_TOUR,
      title: 'Dubai Luxury 7-Day Group Departure',
      destination: 'Dubai',
      country: 'United Arab Emirates',
      durationDays: 7,
      durationNights: 6,
      heroImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop',
      galleryImages: [
        'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?q=80&w=1200&auto=format&fit=crop'
      ],
      overview: 'Experience Dubai with direct flights, 4-star Millennium hotel, Desert Safari with BBQ dinner, and Burj Khalifa 124th floor access.',
      inclusions: [
        'Return Air Ticket on Emirates / FlyDubai (Direct)',
        '6 Nights in 4-Star Hotel with Breakfast',
        'Desert Safari with Tanoura Show & BBQ Dinner',
        'Dubai Marina Luxury Dhow Cruise with Buffet',
        'UAE Tourist Visa & Travel Insurance'
      ],
      exclusions: ['Tourism Dirham fee', 'Personal expenses'],
      itinerary: [
        { day: 1, title: 'Arrival in Dubai', description: 'Meet & greet, hotel transfer.' },
        { day: 2, title: 'City Tour & Burj Khalifa', description: 'Modern Dubai highlights & Burj Khalifa 124.' },
        { day: 3, title: 'Desert Safari', description: '4x4 dune bashing & BBQ dinner.' }
      ],
      airline: 'Emirates / FlyDubai',
      hotelRating: 4,
      visaIncluded: true,
      isFeatured: true,
      departures: {
        create: [
          {
            id: 'dep-dxb-oct-15',
            departureDate: new Date('2026-10-15'),
            returnDate: new Date('2026-10-22'),
            totalSeats: 25,
            availableSeats: 6,
            supplierNetPricePKR: 185000,
            status: 'OPEN'
          },
          {
            id: 'dep-dxb-oct-28',
            departureDate: new Date('2026-10-28'),
            returnDate: new Date('2026-11-04'),
            totalSeats: 30,
            availableSeats: 12,
            supplierNetPricePKR: 188000,
            status: 'OPEN'
          }
        ]
      }
    }
  });

  const ksaProduct = await prisma.product.upsert({
    where: {
      supplierId_supplierProductId: {
        supplierId: airdeskSupplier.id,
        supplierProductId: 'AD-KSA-15D-UMRAH'
      }
    },
    update: {},
    create: {
      id: 'gnk-prod-ksa-02',
      supplierId: airdeskSupplier.id,
      supplierProductId: 'AD-KSA-15D-UMRAH',
      supplierProductCode: 'UMR-15D-VIP',
      productType: ProductType.UMRAH,
      title: 'Saudi Executive Umrah 15-Day Group',
      destination: 'Makkah & Madinah',
      country: 'Saudi Arabia',
      durationDays: 15,
      durationNights: 14,
      heroImage: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1200&auto=format&fit=crop',
      overview: '5-Star Clock Tower hotel in Makkah and 4-star in Madinah, bullet train transport, and guided Ziarat.',
      inclusions: [
        'Direct Flights (Saudia / PIA)',
        '8 Nights in Makkah (5-Star Clock Tower)',
        '6 Nights in Madinah (4-Star Millennium)',
        'Haramain High Speed Bullet Train',
        'Electronic Umrah Visa & Saudi Insurance'
      ],
      exclusions: ['Room service', 'Extra personal meals'],
      itinerary: [
        { day: 1, title: 'Arrival in Jeddah & Makkah Umrah', description: 'Transfer to Makkah and perform Umrah.' },
        { day: 9, title: 'Haramain Train to Madinah', description: 'Bullet train travel to Madinah Munawwarah.' }
      ],
      airline: 'Saudia Airlines',
      hotelRating: 5,
      visaIncluded: true,
      isFeatured: true,
      departures: {
        create: [
          {
            id: 'dep-ksa-oct-20',
            departureDate: new Date('2026-10-20'),
            returnDate: new Date('2026-11-04'),
            totalSeats: 40,
            availableSeats: 14,
            supplierNetPricePKR: 225000,
            status: 'OPEN'
          }
        ]
      }
    }
  });
  console.log('✅ Seeded Products & Departures: Dubai 7D, Saudi Umrah 15D');

  // 5. Seed Pricing Rules
  await prisma.pricingRule.upsert({
    where: { id: 'rule-agent-prod-01' },
    update: {},
    create: {
      id: 'rule-agent-prod-01',
      name: 'ABC Travels Dubai Group VIP Override',
      priority: 1,
      agencyId: abcAgency.id,
      productId: 'AD-DXB-7D-EXP',
      markupType: MarkupType.FIXED,
      markupValue: 12000,
      currency: 'PKR',
      isActive: true
    }
  });

  await prisma.pricingRule.upsert({
    where: { id: 'rule-agent-02' },
    update: {},
    create: {
      id: 'rule-agent-02',
      name: 'ABC Travels Preferred Partner Margin (5%)',
      priority: 2,
      agencyId: abcAgency.id,
      markupType: MarkupType.PERCENTAGE,
      markupValue: 5,
      currency: 'PKR',
      isActive: true
    }
  });

  await prisma.pricingRule.upsert({
    where: { id: 'rule-default-07' },
    update: {},
    create: {
      id: 'rule-default-07',
      name: 'GNK Connect Global Default Markup',
      priority: 5,
      markupType: MarkupType.FIXED,
      markupValue: 10000,
      currency: 'PKR',
      isActive: true
    }
  });
  console.log('✅ Seeded Hierarchical Pricing Rules (Priority 1, 2, 5)');

  // 6. Seed Sample Confirmed Booking with Dual IDs
  await prisma.booking.upsert({
    where: { id: 'GNK-2026-00124' },
    update: {},
    create: {
      id: 'GNK-2026-00124',
      supplierBookingId: 'AD-849302',
      supplierId: 'airdesk',
      productId: dxbProduct.id,
      supplierProductId: 'AD-DXB-7D-EXP',
      departureId: 'dep-dxb-oct-15',
      agentId: 'user-abc-owner',
      agencyId: abcAgency.id,
      totalSeats: 2,
      currency: 'PKR',
      supplierNetPricePerSeatPKR: 185000,
      totalSupplierNetPKR: 370000,
      markupPerSeatPKR: 12000,
      totalMarkupPKR: 24000,
      sellingPricePerSeatPKR: 197000,
      totalAgentSellingPricePKR: 394000,
      pricingRuleSnapshot: {
        ruleId: 'rule-agent-prod-01',
        ruleName: 'ABC Travels Dubai Group VIP Override',
        markupType: 'FIXED',
        markupValue: 12000
      },
      status: GNKBookingStatus.SUPPLIER_CONFIRMED,
      paymentStatus: PaymentStatus.PAYMENT_VERIFIED,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentReferenceNumber: 'HBL-FT-948201938',
      paymentProofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop',
      passengers: {
        create: [
          {
            title: 'Mr',
            firstName: 'Kamran',
            lastName: 'Akhtar',
            passportNumber: 'PK8392018',
            passportExpiry: '2030-05-12',
            dob: '1985-04-18',
            nationality: 'Pakistani',
            gender: 'MALE',
            passengerType: 'ADULT'
          },
          {
            title: 'Mrs',
            firstName: 'Samina',
            lastName: 'Kamran',
            passportNumber: 'PK8392019',
            passportExpiry: '2030-05-12',
            dob: '1988-11-24',
            nationality: 'Pakistani',
            gender: 'FEMALE',
            passengerType: 'ADULT'
          }
        ]
      },
      statusHistory: {
        create: [
          { status: GNKBookingStatus.PENDING_APPROVAL, changedBy: 'Tariq Mansoor (Agent)', notes: 'Booking requested' },
          { status: GNKBookingStatus.APPROVED, changedBy: 'Admin (GNK)', notes: 'Payment verified' },
          { status: GNKBookingStatus.SUPPLIER_CONFIRMED, changedBy: 'AirDesk Groups API', notes: 'Confirmed with ref AD-849302' }
        ]
      }
    }
  });
  console.log('✅ Seeded Sample Confirmed Booking (GNK-2026-00124 / AD-849302)');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
