-- Lock freezes postings without deactivating the account.
ALTER TABLE "LedgerAccount" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;
