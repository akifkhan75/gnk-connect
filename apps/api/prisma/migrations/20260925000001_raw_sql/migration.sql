-- Create sequence for booking refs
CREATE SEQUENCE IF NOT EXISTS booking_ref_seq START 100001;

-- Function to generate booking ref (e.g. GNK-2026-100001)
CREATE OR REPLACE FUNCTION generate_booking_ref()
RETURNS TEXT AS $$
BEGIN
    RETURN 'GNK-' || extract(year from current_date)::TEXT || '-' || nextval('booking_ref_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Alter Booking table to use the sequence by default
ALTER TABLE "Booking" ALTER COLUMN "reference" SET DEFAULT generate_booking_ref();

-- Create trigger function for ledger balance check (Σdebit = Σcredit per transaction)
CREATE OR REPLACE FUNCTION check_ledger_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
    total_debit DECIMAL;
    total_credit DECIMAL;
BEGIN
    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO total_debit, total_credit
    FROM "LedgerEntry"
    WHERE "transactionId" = NEW."transactionId";

    IF total_debit != total_credit THEN
        RAISE EXCEPTION 'Ledger transaction % is unbalanced (Debit: %, Credit: %)', NEW."transactionId", total_debit, total_credit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to LedgerEntry
CREATE CONSTRAINT TRIGGER ensure_ledger_balance
AFTER INSERT OR UPDATE ON "LedgerEntry"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_ledger_transaction_balance();

-- Partial index for active users
CREATE UNIQUE INDEX "PartnerUser_email_active_idx" ON "PartnerUser"("email") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "StaffUser_email_active_idx" ON "StaffUser"("email") WHERE "deletedAt" IS NULL;
