-- AirDesk per-seat discount rates (adult / child / infant).
ALTER TABLE "BookingConcession" ADD COLUMN "adultAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "BookingConcession" ADD COLUMN "childAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "BookingConcession" ADD COLUMN "infantAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;
