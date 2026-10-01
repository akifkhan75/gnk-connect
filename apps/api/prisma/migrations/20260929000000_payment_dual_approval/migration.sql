-- Two-step approval for large payments: the first approver is recorded while the payment stays SUBMITTED.
ALTER TABLE "Payment" ADD COLUMN "firstApprovedById" UUID;
ALTER TABLE "Payment" ADD COLUMN "firstApprovedAt" TIMESTAMP(3);
