ALTER TABLE "User"
  ADD COLUMN "marketing_consent_at" TIMESTAMP(3),
  ADD COLUMN "marketing_consent_revoked_at" TIMESTAMP(3),
  ADD COLUMN "marketing_consent_version" TEXT;

ALTER TABLE "Product"
  ADD COLUMN "manufacturer_name" TEXT,
  ADD COLUMN "manufacturer_address" TEXT,
  ADD COLUMN "storage_conditions" TEXT,
  ADD COLUMN "conformity_number" TEXT,
  ADD COLUMN "conformity_url" TEXT,
  ADD COLUMN "usage_restrictions" TEXT,
  ADD COLUMN "tnved_code" TEXT,
  ADD COLUMN "okpd2_code" TEXT,
  ADD COLUMN "feed_additive_registration_number" TEXT,
  ADD COLUMN "feed_additive_registry_url" TEXT;

ALTER TABLE "Order"
  ADD COLUMN "terms_version" TEXT,
  ADD COLUMN "delivery_price_confirmed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Order" SET "delivery_price_confirmed" = true WHERE "delivery_method" = 'pickup' OR "delivery_price" > 0;
