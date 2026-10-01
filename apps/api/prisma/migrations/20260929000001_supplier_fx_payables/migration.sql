-- Suppliers that bill in a foreign currency post confirmed bookings to their own payable account.
ALTER TABLE "Supplier" ADD COLUMN "payableAccountId" UUID;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_payableAccountId_fkey"
  FOREIGN KEY ("payableAccountId") REFERENCES "LedgerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD COLUMN "supplierCostCurrency" CHAR(3);
ALTER TABLE "Booking" ADD COLUMN "supplierCostFc" DECIMAL(14,2);
ALTER TABLE "Booking" ADD COLUMN "supplierCostRate" DECIMAL(18,6);
