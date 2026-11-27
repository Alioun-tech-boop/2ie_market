ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_PAYMENT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_PAYMENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_PAYMENT_REJECTED';

CREATE TYPE "MerchantSubscriptionPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "stores"
  ADD COLUMN "subscription_expires_at" TIMESTAMP(3),
  ADD COLUMN "last_subscription_reminder_at" TIMESTAMP(3);

-- Les boutiques déjà validées disposent d'un mois à compter de leur validation
-- (ou de leur création pour les anciennes données sans date de validation).
UPDATE "stores"
SET "subscription_expires_at" = COALESCE("reviewed_at", "created_at") + INTERVAL '1 month'
WHERE "approval_status" = 'APPROVED';

CREATE TABLE "merchant_subscription_payments" (
  "id" UUID NOT NULL,
  "store_id" UUID NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 1000,
  "proof_path" VARCHAR(500) NOT NULL,
  "status" "MerchantSubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "review_note" VARCHAR(500),
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  CONSTRAINT "merchant_subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stores_subscription_expires_at_idx" ON "stores"("subscription_expires_at");
CREATE INDEX "merchant_subscription_payments_store_id_status_submitted_at_idx"
  ON "merchant_subscription_payments"("store_id", "status", "submitted_at");
CREATE INDEX "merchant_subscription_payments_status_submitted_at_idx"
  ON "merchant_subscription_payments"("status", "submitted_at");

ALTER TABLE "merchant_subscription_payments"
  ADD CONSTRAINT "merchant_subscription_payments_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
