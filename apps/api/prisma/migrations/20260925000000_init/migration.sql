CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "PartnerAccountType" AS ENUM ('AGENCY', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "PartnerAccountStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PartnerRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'LOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "Realm" AS ENUM ('PARTNER', 'STAFF');

-- CreateEnum
CREATE TYPE "ThemePref" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "OneTimeTokenPurpose" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "KycDocType" AS ENUM ('DTS_LICENSE', 'NTN_CERTIFICATE', 'CNIC_FRONT', 'CNIC_BACK', 'IATA_CERTIFICATE', 'BANK_LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "KycDocStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('KYC', 'PAYMENT_PROOF', 'LOGO', 'INVOICE', 'PASSPORT_COPY');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('GROUP', 'HOTEL', 'UMRAH', 'ZIARAT', 'FLIGHT', 'TRANSFER', 'VISA', 'OTHER');

-- CreateEnum
CREATE TYPE "DepartureStatus" AS ENUM ('OPEN', 'FILLING_FAST', 'SOLD_OUT', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PricingScope" AS ENUM ('DEFAULT', 'SUPPLIER', 'PRODUCT_TYPE', 'PRODUCT', 'DEPARTURE', 'TIER', 'PARTNER', 'PARTNER_PRODUCT');

-- CreateEnum
CREATE TYPE "MarkupType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "RoundingMode" AS ENUM ('NONE', 'NEAREST_10', 'NEAREST_100', 'NEAREST_500', 'NEAREST_1000', 'CEIL_100', 'CEIL_500', 'CEIL_1000');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUBMITTED_TO_SUPPLIER', 'SUPPLIER_PENDING', 'CONFIRMED', 'SUPPLIER_FAILED', 'CANCELLATION_REQUESTED', 'CANCELLED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaxType" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "Title" AS ENUM ('MR', 'MRS', 'MS', 'MISS', 'MSTR');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CARD', 'GATEWAY', 'CREDIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'FAILED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('PARTNER_RECEIVABLE', 'GNK_REVENUE', 'SUPPLIER_PAYABLE', 'BANK', 'CASH');

-- CreateTable
CREATE TABLE "PartnerAccount" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PartnerAccountType" NOT NULL,
    "status" "PartnerAccountStatus" NOT NULL DEFAULT 'DRAFT',
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "dtsLicenseNo" TEXT,
    "iataCode" TEXT,
    "ntn" TEXT,
    "cnic" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'PK',
    "address" TEXT,
    "phone" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "logoFileId" UUID,
    "pricingTierId" UUID,
    "creditLimit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "ledgerAccountId" UUID,

    CONSTRAINT "PartnerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerUser" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "themePreference" "ThemePref" NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PartnerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMember" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "PartnerRole" NOT NULL,
    "invitedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInvite" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "role" "PartnerRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,

    CONSTRAINT "PartnerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "totpSecretEnc" TEXT,
    "totpEnabledAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "themePreference" "ThemePref" NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "StaffUserRole" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,

    CONSTRAINT "StaffUserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "realm" "Realm" NOT NULL,
    "partnerUserId" UUID,
    "staffUserId" UUID,
    "refreshHash" TEXT NOT NULL,
    "familyId" UUID NOT NULL,
    "userAgent" TEXT,
    "ipAddress" INET,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneTimeToken" (
    "id" UUID NOT NULL,
    "realm" "Realm" NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" "OneTimeTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "OneTimeToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" UUID NOT NULL,
    "purpose" "FilePurpose" NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "ownerRealm" "Realm" NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "accountId" UUID,
    "scanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "type" "KycDocType" NOT NULL,
    "fileId" UUID NOT NULL,
    "status" "KycDocStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNote" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "baseUrl" TEXT,
    "credentialsEnc" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "title" TEXT NOT NULL,
    "sector" TEXT,
    "airline" TEXT,
    "destination" TEXT NOT NULL,
    "country" CHAR(2) NOT NULL,
    "durationDays" INTEGER,
    "content" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "rawSnapshot" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departure" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "supplierDepartureId" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "returnDate" DATE,
    "totalSeats" INTEGER NOT NULL,
    "supplierAvailable" INTEGER NOT NULL,
    "heldSeats" INTEGER NOT NULL DEFAULT 0,
    "supplierNet" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "baggage" TEXT,
    "status" "DepartureStatus" NOT NULL DEFAULT 'OPEN',
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Departure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "PricingScope" NOT NULL,
    "supplierId" UUID,
    "productType" "ProductType",
    "productId" UUID,
    "departureId" UUID,
    "accountId" UUID,
    "pricingTierId" UUID,
    "markupType" "MarkupType" NOT NULL,
    "markupValue" DECIMAL(12,4) NOT NULL,
    "minMarkup" DECIMAL(14,2),
    "maxMarkup" DECIMAL(14,2),
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "rounding" "RoundingMode" NOT NULL DEFAULT 'NONE',
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdById" UUID NOT NULL,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "partnerAccountId" UUID,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingTier" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceQuote" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "departureId" UUID NOT NULL,
    "seats" INTEGER NOT NULL,
    "supplierNet" DECIMAL(14,2) NOT NULL,
    "markup" DECIMAL(14,2) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "totalPrice" DECIMAL(14,2) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSequence" (
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BookingSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "departureId" UUID NOT NULL,
    "supplierBookingRef" TEXT,
    "supplierPnr" TEXT,
    "seats" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "supplierNetUnit" DECIMAL(14,2) NOT NULL,
    "markupUnit" DECIMAL(14,2) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "totalPrice" DECIMAL(14,2) NOT NULL,
    "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pricingSnapshot" JSONB NOT NULL,
    "quoteId" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "paymentState" "PaymentState" NOT NULL DEFAULT 'UNPAID',
    "holdExpiresAt" TIMESTAMP(3),
    "agentNotes" TEXT,
    "internalNotes" TEXT,
    "rejectionReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "type" "PaxType" NOT NULL,
    "title" "Title" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "nationality" CHAR(2) NOT NULL,
    "passportNumberEnc" TEXT NOT NULL,
    "passportLast4" CHAR(4) NOT NULL,
    "passportExpiry" DATE NOT NULL,
    "cnicEnc" TEXT,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingStatusEvent" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "from" "BookingStatus",
    "to" "BookingStatus" NOT NULL,
    "actorRealm" "Realm",
    "actorId" UUID,
    "reason" TEXT,
    "supplierRaw" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCallLog" (
    "id" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "bookingId" UUID,
    "operation" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "requestBody" JSONB NOT NULL,
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "durationMs" INTEGER NOT NULL,
    "errorKind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodConfig" (
    "method" "PaymentMethod" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "PaymentMethodConfig_pkey" PRIMARY KEY ("method")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "bookingId" UUID,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "bankName" TEXT,
    "transactionRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "proofFileId" UUID,
    "submittedById" UUID NOT NULL,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "gatewayPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" UUID NOT NULL,
    "type" "LedgerAccountType" NOT NULL,
    "accountId" UUID,
    "name" TEXT NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bookingId" UUID,
    "paymentId" UUID,
    "createdById" UUID,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "ledgerAccountId" UUID NOT NULL,
    "debit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "fileId" UUID,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "realm" "Realm" NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorRealm" "Realm",
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" INET,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAccount_code_key" ON "PartnerAccount"("code");

-- CreateIndex
CREATE INDEX "PartnerAccount_createdAt_idx" ON "PartnerAccount"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerUser_email_key" ON "PartnerUser"("email");

-- CreateIndex
CREATE INDEX "PartnerMember_userId_idx" ON "PartnerMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMember_accountId_userId_key" ON "PartnerMember"("accountId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerInvite_tokenHash_key" ON "PartnerInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "PartnerInvite_accountId_idx" ON "PartnerInvite"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshHash_key" ON "Session"("refreshHash");

-- CreateIndex
CREATE INDEX "Session_partnerUserId_idx" ON "Session"("partnerUserId");

-- CreateIndex
CREATE INDEX "Session_staffUserId_idx" ON "Session"("staffUserId");

-- CreateIndex
CREATE INDEX "Session_familyId_idx" ON "Session"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "OneTimeToken_tokenHash_key" ON "OneTimeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "OneTimeToken_userId_purpose_idx" ON "OneTimeToken"("userId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_bucketKey_key" ON "StoredFile"("bucketKey");

-- CreateIndex
CREATE INDEX "StoredFile_accountId_purpose_idx" ON "StoredFile"("accountId", "purpose");

-- CreateIndex
CREATE INDEX "KycDocument_accountId_idx" ON "KycDocument"("accountId");

-- CreateIndex
CREATE INDEX "KycDocument_status_idx" ON "KycDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE INDEX "Product_isPublished_idx" ON "Product"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "Product_supplierId_supplierProductId_key" ON "Product"("supplierId", "supplierProductId");

-- CreateIndex
CREATE INDEX "Departure_departureDate_idx" ON "Departure"("departureDate");

-- CreateIndex
CREATE INDEX "Departure_status_idx" ON "Departure"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Departure_productId_supplierDepartureId_key" ON "Departure"("productId", "supplierDepartureId");

-- CreateIndex
CREATE INDEX "PricingRule_isActive_idx" ON "PricingRule"("isActive");

-- CreateIndex
CREATE INDEX "PricingRule_accountId_idx" ON "PricingRule"("accountId");

-- CreateIndex
CREATE INDEX "PricingRule_productId_idx" ON "PricingRule"("productId");

-- CreateIndex
CREATE INDEX "PricingRule_supplierId_idx" ON "PricingRule"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingTier_name_key" ON "PricingTier"("name");

-- CreateIndex
CREATE INDEX "PriceQuote_accountId_expiresAt_idx" ON "PriceQuote"("accountId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_quoteId_key" ON "Booking"("quoteId");

-- CreateIndex
CREATE INDEX "Booking_accountId_createdAt_idx" ON "Booking"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");

-- CreateIndex
CREATE INDEX "Booking_departureId_idx" ON "Booking"("departureId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_accountId_idempotencyKey_key" ON "Booking"("accountId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Passenger_bookingId_idx" ON "Passenger"("bookingId");

-- CreateIndex
CREATE INDEX "BookingStatusEvent_bookingId_createdAt_idx" ON "BookingStatusEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierCallLog_bookingId_idx" ON "SupplierCallLog"("bookingId");

-- CreateIndex
CREATE INDEX "SupplierCallLog_supplierId_createdAt_idx" ON "SupplierCallLog"("supplierId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_accountId_idx" ON "Payment"("accountId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_method_transactionRef_key" ON "Payment"("method", "transactionRef");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_accountId_key" ON "LedgerAccount"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_reference_key" ON "LedgerTransaction"("reference");

-- CreateIndex
CREATE INDEX "LedgerEntry_ledgerAccountId_transactionId_idx" ON "LedgerEntry"("ledgerAccountId", "transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_bookingId_key" ON "Invoice"("bookingId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "PartnerAccount" ADD CONSTRAINT "PartnerAccount_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "LedgerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PartnerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PartnerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffUserRole" ADD CONSTRAINT "StaffUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffUserRole" ADD CONSTRAINT "StaffUserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_partnerUserId_fkey" FOREIGN KEY ("partnerUserId") REFERENCES "PartnerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PartnerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departure" ADD CONSTRAINT "Departure_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_partnerAccountId_fkey" FOREIGN KEY ("partnerAccountId") REFERENCES "PartnerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PartnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusEvent" ADD CONSTRAINT "BookingStatusEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCallLog" ADD CONSTRAINT "SupplierCallLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

