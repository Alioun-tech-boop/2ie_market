ALTER TABLE "users"
  ADD COLUMN "privacy_accepted_at" TIMESTAMP(3),
  ADD COLUMN "terms_accepted_at" TIMESTAMP(3),
  ADD COLUMN "management_accepted_at" TIMESTAMP(3),
  ADD COLUMN "policy_version" VARCHAR(20) NOT NULL DEFAULT '2026-11-28';
