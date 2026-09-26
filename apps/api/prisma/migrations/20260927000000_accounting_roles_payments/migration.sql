-- Accounting core (chart of accounts, vouchers, multi-currency lines, closed periods),
-- payment attachments/allocations, custom staff roles and forced password change.
-- Existing ledger rows are migrated in place: balances are unchanged.

-- ---------- Enums ----------
CREATE TYPE "AccountClass" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');
CREATE TYPE "VoucherType" AS ENUM ('SALE', 'RECEIPT', 'PAYMENT', 'JOURNAL', 'REVERSAL', 'ADJUSTMENT');
CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'POSTED', 'REJECTED');
ALTER TYPE "FilePurpose" ADD VALUE 'VOUCHER';

-- ---------- Users & roles ----------
ALTER TABLE "PartnerUser"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notificationPrefs" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "StaffUser"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notificationPrefs" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Role"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "description" TEXT;

-- ---------- Currencies ----------
CREATE TABLE "Currency" (
    "code" CHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);
INSERT INTO "Currency" ("code", "name", "symbol") VALUES
  ('PKR', 'Pakistani rupee', 'Rs'),
  ('SAR', 'Saudi riyal', 'SR'),
  ('AED', 'UAE dirham', 'AED'),
  ('USD', 'US dollar', '$');

CREATE TABLE "ExchangeRate" (
    "id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExchangeRate_rate_positive" CHECK ("rate" > 0)
);
CREATE INDEX "ExchangeRate_currency_date_idx" ON "ExchangeRate"("currency", "date");

-- ---------- Chart of accounts (LedgerAccount) ----------
ALTER TABLE "LedgerAccount"
  ADD COLUMN "class" "AccountClass",
  ADD COLUMN "code" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
  ADD COLUMN "description" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isGroup" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "parentId" UUID,
  ADD COLUMN "systemKey" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing accounts take their place in the chart.
UPDATE "LedgerAccount" la
   SET "code" = '1200-' || pa."code", "class" = 'ASSET'
  FROM "PartnerAccount" pa
 WHERE la."type" = 'PARTNER_RECEIVABLE' AND la."accountId" = pa."id";
UPDATE "LedgerAccount" SET "code" = '1110', "class" = 'ASSET', "systemKey" = 'CASH', "name" = 'Cash in hand'
 WHERE "type" = 'CASH' AND "accountId" IS NULL;
UPDATE "LedgerAccount" SET "code" = '1121', "class" = 'ASSET', "systemKey" = 'BANK', "name" = 'Main bank account'
 WHERE "type" = 'BANK' AND "accountId" IS NULL;
UPDATE "LedgerAccount" SET "code" = '2110', "class" = 'LIABILITY', "systemKey" = 'SUPPLIER_PAYABLE', "name" = 'Supplier payable – general'
 WHERE "type" = 'SUPPLIER_PAYABLE' AND "accountId" IS NULL;
UPDATE "LedgerAccount" SET "code" = '4100', "class" = 'INCOME', "systemKey" = 'REVENUE', "name" = 'Booking margin revenue'
 WHERE "type" = 'GNK_REVENUE' AND "accountId" IS NULL;

ALTER TABLE "LedgerAccount" ALTER COLUMN "type" DROP NOT NULL;

-- Standard travel-agency chart. (code, parent, name, class, isGroup, systemKey)
CREATE TEMP TABLE coa_seed (code TEXT, parent TEXT, name TEXT, class "AccountClass", is_group BOOLEAN, system_key TEXT, ord INT);
INSERT INTO coa_seed VALUES
  ('1000', NULL,   'Assets',                               'ASSET',     true,  NULL, 1),
  ('1100', '1000', 'Cash and bank',                        'ASSET',     true,  NULL, 2),
  ('1110', '1100', 'Cash in hand',                         'ASSET',     false, 'CASH', 3),
  ('1120', '1100', 'Bank accounts',                        'ASSET',     true,  NULL, 3),
  ('1121', '1120', 'Main bank account',                    'ASSET',     false, 'BANK', 4),
  ('1200', '1000', 'Accounts receivable – agents',         'ASSET',     true,  'AR_CONTROL', 2),
  ('1300', '1000', 'Advances to suppliers',                'ASSET',     false, NULL, 2),
  ('1400', '1000', 'Prepaid expenses',                     'ASSET',     false, NULL, 2),
  ('1500', '1000', 'Other receivables',                    'ASSET',     false, NULL, 2),
  ('2000', NULL,   'Liabilities',                          'LIABILITY', true,  NULL, 1),
  ('2100', '2000', 'Accounts payable – suppliers',         'LIABILITY', true,  NULL, 2),
  ('2110', '2100', 'Supplier payable – general',           'LIABILITY', false, 'SUPPLIER_PAYABLE', 3),
  ('2200', '2000', 'Taxes payable',                        'LIABILITY', true,  NULL, 2),
  ('2210', '2200', 'Sales tax payable',                    'LIABILITY', false, NULL, 3),
  ('2220', '2200', 'Withholding tax payable',              'LIABILITY', false, NULL, 3),
  ('2300', '2000', 'Accrued expenses',                     'LIABILITY', false, NULL, 2),
  ('3000', NULL,   'Equity',                               'EQUITY',    true,  NULL, 1),
  ('3100', '3000', 'Owner''s capital',                     'EQUITY',    false, NULL, 2),
  ('3200', '3000', 'Retained earnings',                    'EQUITY',    false, NULL, 2),
  ('3300', '3000', 'Drawings',                             'EQUITY',    false, NULL, 2),
  ('4000', NULL,   'Income',                               'INCOME',    true,  NULL, 1),
  ('4100', '4000', 'Booking margin revenue',               'INCOME',    false, 'REVENUE', 2),
  ('4200', '4000', 'Service fees',                         'INCOME',    false, NULL, 2),
  ('4300', '4000', 'Commission income',                    'INCOME',    false, NULL, 2),
  ('4800', '4000', 'Exchange gain / loss',                 'INCOME',    false, 'FX', 2),
  ('4900', '4000', 'Other income',                         'INCOME',    false, NULL, 2),
  ('5000', NULL,   'Expenses',                             'EXPENSE',   true,  NULL, 1),
  ('5100', '5000', 'Salaries and wages',                   'EXPENSE',   false, NULL, 2),
  ('5200', '5000', 'Rent and utilities',                   'EXPENSE',   false, NULL, 2),
  ('5300', '5000', 'Bank charges',                         'EXPENSE',   false, 'BANK_CHARGES', 2),
  ('5400', '5000', 'Marketing',                            'EXPENSE',   false, NULL, 2),
  ('5500', '5000', 'Office and administration',            'EXPENSE',   false, NULL, 2),
  ('5600', '5000', 'Communication and IT',                 'EXPENSE',   false, NULL, 2),
  ('5900', '5000', 'Adjustments and write-offs',           'EXPENSE',   false, 'ADJUSTMENTS', 2);

INSERT INTO "LedgerAccount" ("id", "code", "name", "class", "isGroup", "systemKey")
SELECT gen_random_uuid(), s.code, s.name, s.class, s.is_group, s.system_key
  FROM coa_seed s
 WHERE NOT EXISTS (SELECT 1 FROM "LedgerAccount" la WHERE la."code" = s.code);
-- Migrated rows that already had a code keep it; make sure flags and keys match the seed.
UPDATE "LedgerAccount" la SET "isGroup" = s.is_group, "systemKey" = s.system_key, "class" = s.class
  FROM coa_seed s WHERE la."code" = s.code;
UPDATE "LedgerAccount" la SET "parentId" = p."id"
  FROM coa_seed s JOIN "LedgerAccount" p ON p."code" = s.parent
 WHERE la."code" = s.code;
UPDATE "LedgerAccount" la SET "parentId" = (SELECT "id" FROM "LedgerAccount" WHERE "code" = '1200')
 WHERE la."accountId" IS NOT NULL;
-- Anything left without a code (shouldn't happen) is parked under other receivables.
UPDATE "LedgerAccount" SET "code" = 'LEGACY-' || left("id"::text, 8), "class" = 'ASSET',
       "parentId" = (SELECT "id" FROM "LedgerAccount" WHERE "code" = '1000')
 WHERE "code" IS NULL;
DROP TABLE coa_seed;

ALTER TABLE "LedgerAccount" ALTER COLUMN "code" SET NOT NULL, ALTER COLUMN "class" SET NOT NULL,
  ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "LedgerAccount" DROP COLUMN "type";
DROP TYPE "LedgerAccountType";
CREATE UNIQUE INDEX "LedgerAccount_code_key" ON "LedgerAccount"("code");
CREATE UNIQUE INDEX "LedgerAccount_systemKey_key" ON "LedgerAccount"("systemKey");
CREATE INDEX "LedgerAccount_parentId_idx" ON "LedgerAccount"("parentId");
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LedgerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------- Vouchers (LedgerTransaction) ----------
ALTER TABLE "LedgerTransaction"
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" UUID,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "date" DATE,
  ADD COLUMN "draftLines" JSONB,
  ADD COLUMN "partnerAccountId" UUID,
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "reversalOfId" UUID,
  ADD COLUMN "status" "VoucherStatus" NOT NULL DEFAULT 'POSTED',
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "type" "VoucherType" NOT NULL DEFAULT 'JOURNAL';

UPDATE "LedgerTransaction" SET
  "date" = ("postedAt" AT TIME ZONE 'Asia/Karachi')::date,
  "createdAt" = "postedAt",
  "type" = CASE
    WHEN "paymentId" IS NOT NULL THEN 'RECEIPT'::"VoucherType"
    WHEN "bookingId" IS NOT NULL AND "description" LIKE 'Refund%' THEN 'REVERSAL'::"VoucherType"
    WHEN "bookingId" IS NOT NULL THEN 'SALE'::"VoucherType"
    WHEN "description" LIKE 'Adjustment%' THEN 'ADJUSTMENT'::"VoucherType"
    ELSE 'JOURNAL'::"VoucherType" END;
UPDATE "LedgerTransaction" t SET "partnerAccountId" = la."accountId"
  FROM "LedgerEntry" le JOIN "LedgerAccount" la ON la."id" = le."ledgerAccountId"
 WHERE le."transactionId" = t."id" AND la."accountId" IS NOT NULL;

ALTER TABLE "LedgerTransaction" ALTER COLUMN "date" SET NOT NULL,
  ALTER COLUMN "postedAt" DROP NOT NULL, ALTER COLUMN "postedAt" DROP DEFAULT;
CREATE UNIQUE INDEX "LedgerTransaction_reversalOfId_key" ON "LedgerTransaction"("reversalOfId");
CREATE INDEX "LedgerTransaction_type_date_idx" ON "LedgerTransaction"("type", "date");
CREATE INDEX "LedgerTransaction_status_idx" ON "LedgerTransaction"("status");
CREATE INDEX "LedgerTransaction_partnerAccountId_date_idx" ON "LedgerTransaction"("partnerAccountId", "date");
CREATE INDEX "LedgerTransaction_bookingId_idx" ON "LedgerTransaction"("bookingId");
CREATE INDEX "LedgerTransaction_paymentId_idx" ON "LedgerTransaction"("paymentId");
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "LedgerTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------- Entries ----------
ALTER TABLE "LedgerEntry"
  ADD COLUMN "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
  ADD COLUMN "fcAmount" DECIMAL(14,2),
  ADD COLUMN "narration" TEXT,
  ADD COLUMN "rate" DECIMAL(18,6),
  ADD CONSTRAINT "LedgerEntry_one_sided" CHECK ("debit" >= 0 AND "credit" >= 0 AND ("debit" = 0 OR "credit" = 0)),
  ADD CONSTRAINT "LedgerEntry_fc_complete" CHECK (("currency" = 'PKR') OR ("fcAmount" IS NOT NULL AND "rate" IS NOT NULL));
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Entries belong to posted vouchers only, and posted entries are immutable.
CREATE OR REPLACE FUNCTION ledger_entry_guard()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'Ledger entries are immutable; post a reversal instead';
    END IF;
    IF (SELECT "status" FROM "LedgerTransaction" WHERE "id" = NEW."transactionId") <> 'POSTED' THEN
        RAISE EXCEPTION 'Ledger entries can only be added to posted vouchers';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER ledger_entry_guard
BEFORE INSERT OR UPDATE OR DELETE ON "LedgerEntry"
FOR EACH ROW EXECUTE FUNCTION ledger_entry_guard();

CREATE TABLE "VoucherAttachment" (
    "voucherId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoucherAttachment_pkey" PRIMARY KEY ("voucherId","fileId")
);
ALTER TABLE "VoucherAttachment" ADD CONSTRAINT "VoucherAttachment_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "LedgerTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClosedPeriod" (
    "month" TEXT NOT NULL,
    "closedById" UUID NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClosedPeriod_pkey" PRIMARY KEY ("month")
);

-- ---------- Payments ----------
ALTER TABLE "Payment" ADD COLUMN "depositAccountId" UUID, ADD COLUMN "notes" TEXT;

CREATE TABLE "PaymentAttachment" (
    "paymentId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentAttachment_pkey" PRIMARY KEY ("paymentId","fileId")
);
ALTER TABLE "PaymentAttachment" ADD CONSTRAINT "PaymentAttachment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "PaymentAttachment" ("paymentId", "fileId", "createdAt")
SELECT "id", "proofFileId", "createdAt" FROM "Payment" WHERE "proofFileId" IS NOT NULL;

CREATE TABLE "PaymentAllocation" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentAllocation_amount_positive" CHECK ("amount" > 0)
);
CREATE INDEX "PaymentAllocation_bookingId_idx" ON "PaymentAllocation"("bookingId");
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_bookingId_key" ON "PaymentAllocation"("paymentId", "bookingId");
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
INSERT INTO "PaymentAllocation" ("id", "paymentId", "bookingId", "amount")
SELECT gen_random_uuid(), "id", "bookingId", "amount" FROM "Payment" WHERE "bookingId" IS NOT NULL;

-- ---------- Booking ownership ----------
ALTER TABLE "Booking" ADD COLUMN "assignedStaffId" UUID;
