-- Administration : mise en avant, signalements, paramètres de plateforme et audit.
ALTER TABLE "listings" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "listings" ADD COLUMN "featured_at" TIMESTAMP(3);
CREATE INDEX "listings_status_is_featured_published_at_idx" ON "listings"("status", "is_featured", "published_at");

CREATE TYPE "ReportReason" AS ENUM ('INAPPROPRIATE', 'FRAUD', 'PROHIBITED', 'MISLEADING', 'OTHER');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_note" VARCHAR(500),
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");
CREATE INDEX "reports_listing_id_idx" ON "reports"("listing_id");

ALTER TABLE "reports" ADD CONSTRAINT "reports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

CREATE TABLE "platform_settings" (
    "id" VARCHAR(32) NOT NULL,
    "platform_name" VARCHAR(120) NOT NULL DEFAULT '2ie Market',
    "logo_url" VARCHAR(500),
    "support_email" VARCHAR(160),
    "maintenance_message" VARCHAR(500),
    "reviews_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "platform_settings" ("id", "platform_name", "reviews_enabled", "updated_at")
VALUES ('default', '2ie Market', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
