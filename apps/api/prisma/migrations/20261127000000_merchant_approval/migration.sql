-- Validation administrative des comptes vendeurs et justificatifs de paiement.
CREATE TYPE "MerchantApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "stores"
  ADD COLUMN "approval_status" "MerchantApprovalStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "payment_proof_url" VARCHAR(500),
  ADD COLUMN "review_note" VARCHAR(500),
  ADD COLUMN "reviewed_at" TIMESTAMP(3);

CREATE INDEX "stores_approval_status_created_at_idx" ON "stores"("approval_status", "created_at");
