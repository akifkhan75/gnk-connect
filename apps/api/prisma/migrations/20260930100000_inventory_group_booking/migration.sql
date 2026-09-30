-- CreateEnum
CREATE TYPE "SellingGroupStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CabinClass" AS ENUM ('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST');

-- CreateEnum
CREATE TYPE "InventoryLotStatus" AS ENUM ('OPEN', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "GroupPnrStatus" AS ENUM ('AVAILABLE', 'LOW_INVENTORY', 'FULL', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GroupPnrPaxKind" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "FlightSegmentDirection" AS ENUM ('OUTBOUND', 'INBOUND', 'SINGLE');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('INITIAL_LOAD', 'HOLD', 'RELEASE_HOLD', 'HOLD_EXPIRED', 'CONFIRM', 'CANCEL_BOOKING_ADJUSTMENT', 'MANUAL_ADJUSTMENT', 'RECONCILE_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "InventoryHoldStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingConcessionKind" AS ENUM ('CHILD_SEATS', 'INFANT_SEATS', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "BookingConcessionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingConcessionInitiatedBy" AS ENUM ('AGENT', 'PLATFORM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'QUOTED';
ALTER TYPE "BookingStatus" ADD VALUE 'HELD';
ALTER TYPE "BookingStatus" ADD VALUE 'PAYMENT_PENDING';
ALTER TYPE "BookingStatus" ADD VALUE 'AWAITING_RECEIPT';
ALTER TYPE "BookingStatus" ADD VALUE 'RECEIPT_ADDED';
ALTER TYPE "BookingStatus" ADD VALUE 'TICKETED';
ALTER TYPE "BookingStatus" ADD VALUE 'EXPIRED_HOLD';
ALTER TYPE "BookingStatus" ADD VALUE 'REFUND_REQUESTED';
ALTER TYPE "BookingStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "BookingStatus" ADD VALUE 'REFUNDED_PARTIAL';
ALTER TYPE "BookingStatus" ADD VALUE 'REFUND_REJECTED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookedAdults" INTEGER,
ADD COLUMN     "bookedChildren" INTEGER,
ADD COLUMN     "bookedInfants" INTEGER,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "fareSubtotalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "grantedChildSeats" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grantedInfantSeats" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "groupPnrId" UUID,
ADD COLUMN     "heldUntil" TIMESTAMP(3),
ADD COLUMN     "inventoryLotId" UUID,
ADD COLUMN     "passengerDetailsRequestedAt" TIMESTAMP(3),
ADD COLUMN     "paymentDeadlineAt" TIMESTAMP(3),
ADD COLUMN     "pnrAssignedSeatCount" INTEGER,
ALTER COLUMN "supplierId" DROP NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL,
ALTER COLUMN "departureId" DROP NOT NULL,
ALTER COLUMN "supplierNetUnit" SET DEFAULT 0,
ALTER COLUMN "markupUnit" SET DEFAULT 0,
ALTER COLUMN "pricingSnapshot" SET DEFAULT '{}',
ALTER COLUMN "quoteId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Passenger" ADD COLUMN     "groupPnrId" UUID,
ADD COLUMN     "ticketNumber" TEXT;

-- CreateTable
CREATE TABLE "SellingGroup" (
    "id" UUID NOT NULL,
    "supplierId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "status" "SellingGroupStatus" NOT NULL DEFAULT 'DRAFT',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "paymentDeadlineHours" INTEGER NOT NULL DEFAULT 24,
    "showAvailableSeats" BOOLEAN NOT NULL DEFAULT true,
    "fareRuleRefs" JSONB NOT NULL DEFAULT '[]',
    "sector" TEXT,
    "airline" TEXT,
    "rowVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SellingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightSegment" (
    "id" UUID NOT NULL,
    "carrierSupplierId" UUID,
    "marketingFlightNumber" TEXT NOT NULL,
    "departureAirport" CHAR(3) NOT NULL,
    "arrivalAirport" CHAR(3) NOT NULL,
    "departureTimeUtc" TIMESTAMP(3) NOT NULL,
    "arrivalTimeUtc" TIMESTAMP(3) NOT NULL,
    "cabinClassBucket" TEXT NOT NULL DEFAULT 'ECONOMY',
    "operatingCarrier" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "rowVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FlightSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellingGroupFlightSegment" (
    "sellingGroupId" UUID NOT NULL,
    "flightSegmentId" UUID NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "legDirection" "FlightSegmentDirection" NOT NULL DEFAULT 'OUTBOUND',

    CONSTRAINT "SellingGroupFlightSegment_pkey" PRIMARY KEY ("sellingGroupId","flightSegmentId")
);

-- CreateTable
CREATE TABLE "InventoryLot" (
    "id" UUID NOT NULL,
    "sellingGroupId" UUID NOT NULL,
    "flightSegmentId" UUID NOT NULL,
    "bucketCode" TEXT NOT NULL,
    "cabinClass" "CabinClass" NOT NULL DEFAULT 'ECONOMY',
    "status" "InventoryLotStatus" NOT NULL DEFAULT 'OPEN',
    "seatsTotal" INTEGER NOT NULL DEFAULT 0,
    "seatsHeld" INTEGER NOT NULL DEFAULT 0,
    "seatsConfirmed" INTEGER NOT NULL DEFAULT 0,
    "childSeatsTotal" INTEGER NOT NULL DEFAULT 0,
    "childSeatsHeld" INTEGER NOT NULL DEFAULT 0,
    "childSeatsConfirmed" INTEGER NOT NULL DEFAULT 0,
    "infantSeatsTotal" INTEGER NOT NULL DEFAULT 0,
    "infantSeatsHeld" INTEGER NOT NULL DEFAULT 0,
    "infantSeatsConfirmed" INTEGER NOT NULL DEFAULT 0,
    "fareAmount" DECIMAL(14,2),
    "costAmount" DECIMAL(14,2),
    "fareCurrency" CHAR(3),
    "childFareAmount" DECIMAL(14,2),
    "infantFareAmount" DECIMAL(14,2),
    "rowVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupPnr" (
    "id" UUID NOT NULL,
    "sellingGroupId" UUID NOT NULL,
    "inventoryLotId" UUID NOT NULL,
    "pnrCode" VARCHAR(48) NOT NULL,
    "allocatedSeats" INTEGER NOT NULL,
    "bookedSeats" INTEGER NOT NULL DEFAULT 0,
    "confirmedSeats" INTEGER NOT NULL DEFAULT 0,
    "heldSeats" INTEGER NOT NULL DEFAULT 0,
    "availableSeats" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "GroupPnrStatus" NOT NULL DEFAULT 'AVAILABLE',
    "paxKind" "GroupPnrPaxKind",
    "notes" TEXT,
    "rowVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GroupPnr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "inventoryLotId" UUID NOT NULL,
    "movementType" "InventoryMovementType" NOT NULL,
    "seatsDelta" INTEGER NOT NULL,
    "correlationType" TEXT,
    "correlationId" UUID,
    "bookingId" UUID,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryHold" (
    "id" UUID NOT NULL,
    "inventoryLotId" UUID NOT NULL,
    "bookingId" UUID,
    "seatsHeld" INTEGER NOT NULL DEFAULT 1,
    "adultsHeld" INTEGER NOT NULL DEFAULT 0,
    "childrenHeld" INTEGER NOT NULL DEFAULT 0,
    "infantsHeld" INTEGER NOT NULL DEFAULT 0,
    "status" "InventoryHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" VARCHAR(128),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPnrAllocation" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "groupPnrId" UUID NOT NULL,
    "heldSeats" INTEGER NOT NULL DEFAULT 0,
    "confirmedSeats" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPnrAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingConcessionRequest" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "kind" "BookingConcessionKind" NOT NULL,
    "status" "BookingConcessionStatus" NOT NULL DEFAULT 'REQUESTED',
    "initiatedBy" "BookingConcessionInitiatedBy" NOT NULL,
    "requestedChildSeats" INTEGER,
    "approvedChildSeats" INTEGER,
    "requestedInfantSeats" INTEGER,
    "approvedInfantSeats" INTEGER,
    "approvedPnrCode" TEXT,
    "groupPnrId" UUID,
    "requestedDiscountAmount" DECIMAL(14,2),
    "approvedDiscountAmount" DECIMAL(14,2),
    "reason" TEXT,
    "decisionNote" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingConcessionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellingGroup_code_key" ON "SellingGroup"("code");

-- CreateIndex
CREATE INDEX "SellingGroup_status_deletedAt_idx" ON "SellingGroup"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "FlightSegment_departureAirport_arrivalAirport_departureTime_idx" ON "FlightSegment"("departureAirport", "arrivalAirport", "departureTimeUtc");

-- CreateIndex
CREATE INDEX "SellingGroupFlightSegment_flightSegmentId_idx" ON "SellingGroupFlightSegment"("flightSegmentId");

-- CreateIndex
CREATE INDEX "InventoryLot_status_deletedAt_idx" ON "InventoryLot"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "InventoryLot_sellingGroupId_idx" ON "InventoryLot"("sellingGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_sellingGroupId_flightSegmentId_bucketCode_key" ON "InventoryLot"("sellingGroupId", "flightSegmentId", "bucketCode");

-- CreateIndex
CREATE INDEX "GroupPnr_sellingGroupId_deletedAt_idx" ON "GroupPnr"("sellingGroupId", "deletedAt");

-- CreateIndex
CREATE INDEX "GroupPnr_inventoryLotId_isActive_deletedAt_idx" ON "GroupPnr"("inventoryLotId", "isActive", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPnr_inventoryLotId_pnrCode_key" ON "GroupPnr"("inventoryLotId", "pnrCode");

-- CreateIndex
CREATE INDEX "InventoryMovement_inventoryLotId_createdAt_idx" ON "InventoryMovement"("inventoryLotId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_bookingId_idx" ON "InventoryMovement"("bookingId");

-- CreateIndex
CREATE INDEX "InventoryHold_expiresAt_status_idx" ON "InventoryHold"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "InventoryHold_bookingId_idx" ON "InventoryHold"("bookingId");

-- CreateIndex
CREATE INDEX "InventoryHold_inventoryLotId_idx" ON "InventoryHold"("inventoryLotId");

-- CreateIndex
CREATE INDEX "BookingPnrAllocation_groupPnrId_idx" ON "BookingPnrAllocation"("groupPnrId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPnrAllocation_bookingId_groupPnrId_key" ON "BookingPnrAllocation"("bookingId", "groupPnrId");

-- CreateIndex
CREATE INDEX "BookingConcessionRequest_bookingId_status_idx" ON "BookingConcessionRequest"("bookingId", "status");

-- CreateIndex
CREATE INDEX "BookingConcessionRequest_status_createdAt_idx" ON "BookingConcessionRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_inventoryLotId_idx" ON "Booking"("inventoryLotId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Passenger_groupPnrId_idx" ON "Passenger"("groupPnrId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "Departure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_inventoryLotId_fkey" FOREIGN KEY ("inventoryLotId") REFERENCES "InventoryLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_groupPnrId_fkey" FOREIGN KEY ("groupPnrId") REFERENCES "GroupPnr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_groupPnrId_fkey" FOREIGN KEY ("groupPnrId") REFERENCES "GroupPnr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellingGroup" ADD CONSTRAINT "SellingGroup_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSegment" ADD CONSTRAINT "FlightSegment_carrierSupplierId_fkey" FOREIGN KEY ("carrierSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellingGroupFlightSegment" ADD CONSTRAINT "SellingGroupFlightSegment_sellingGroupId_fkey" FOREIGN KEY ("sellingGroupId") REFERENCES "SellingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellingGroupFlightSegment" ADD CONSTRAINT "SellingGroupFlightSegment_flightSegmentId_fkey" FOREIGN KEY ("flightSegmentId") REFERENCES "FlightSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_sellingGroupId_fkey" FOREIGN KEY ("sellingGroupId") REFERENCES "SellingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_flightSegmentId_fkey" FOREIGN KEY ("flightSegmentId") REFERENCES "FlightSegment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPnr" ADD CONSTRAINT "GroupPnr_sellingGroupId_fkey" FOREIGN KEY ("sellingGroupId") REFERENCES "SellingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPnr" ADD CONSTRAINT "GroupPnr_inventoryLotId_fkey" FOREIGN KEY ("inventoryLotId") REFERENCES "InventoryLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryLotId_fkey" FOREIGN KEY ("inventoryLotId") REFERENCES "InventoryLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_inventoryLotId_fkey" FOREIGN KEY ("inventoryLotId") REFERENCES "InventoryLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPnrAllocation" ADD CONSTRAINT "BookingPnrAllocation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPnrAllocation" ADD CONSTRAINT "BookingPnrAllocation_groupPnrId_fkey" FOREIGN KEY ("groupPnrId") REFERENCES "GroupPnr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingConcessionRequest" ADD CONSTRAINT "BookingConcessionRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingConcessionRequest" ADD CONSTRAINT "BookingConcessionRequest_groupPnrId_fkey" FOREIGN KEY ("groupPnrId") REFERENCES "GroupPnr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

