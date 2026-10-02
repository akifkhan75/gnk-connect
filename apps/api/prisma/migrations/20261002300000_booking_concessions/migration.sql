-- Child / infant quotas on the hold, plus post-hold concession requests (AirDesk).
ALTER TABLE "Booking" ADD COLUMN "childSeats" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "infantSeats" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "ConcessionType" AS ENUM ('CHILD_SEATS', 'INFANT_SEATS', 'DISCOUNT');
CREATE TYPE "ConcessionStatus" AS ENUM ('PENDING', 'GRANTED', 'REJECTED', 'CANCELLED');

CREATE TABLE "BookingConcession" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "type" "ConcessionType" NOT NULL,
    "status" "ConcessionStatus" NOT NULL DEFAULT 'PENDING',
    "seats" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grantedSeats" INTEGER NOT NULL DEFAULT 0,
    "grantedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "staffNote" TEXT,
    "requestedByUserId" UUID NOT NULL,
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingConcession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingConcession_bookingId_createdAt_idx" ON "BookingConcession"("bookingId", "createdAt");
CREATE INDEX "BookingConcession_status_idx" ON "BookingConcession"("status");

ALTER TABLE "BookingConcession" ADD CONSTRAINT "BookingConcession_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Booking"
SET "holdExpiresAt" = "createdAt" + interval '24 hours'
WHERE "holdExpiresAt" IS NULL
  AND status IN ('PENDING_APPROVAL', 'APPROVED');
