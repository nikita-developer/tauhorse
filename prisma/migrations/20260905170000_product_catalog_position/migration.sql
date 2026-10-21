ALTER TABLE "Product"
ADD COLUMN "catalog_position" INTEGER NOT NULL DEFAULT 1000;

CREATE INDEX "Product_catalog_position_created_at_idx"
ON "Product"("catalog_position", "created_at");
