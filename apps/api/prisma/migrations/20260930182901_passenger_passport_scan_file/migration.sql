-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "reference" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Passenger" ADD COLUMN     "passportScanFileId" UUID;
