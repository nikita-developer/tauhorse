ALTER TABLE "User" ADD COLUMN "marketing_emails_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "sale_percent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "sale_starts_at" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "sale_ends_at" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "promo_label" TEXT;
ALTER TABLE "Product" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "MarketingCampaign" (
  "id" SERIAL NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "sent_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Product_is_featured_idx" ON "Product"("is_featured");
CREATE INDEX "Product_sale_ends_at_idx" ON "Product"("sale_ends_at");
