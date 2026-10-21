ALTER TABLE "Order" ADD COLUMN "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "DiscountRule" (
  "id" SERIAL PRIMARY KEY,
  "min_quantity" INTEGER NOT NULL UNIQUE,
  "percent" DECIMAL(5,2) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "SharedCart" (
  "id" SERIAL PRIMARY KEY,
  "token_hash" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "SharedCartItem" (
  "id" SERIAL PRIMARY KEY,
  "shared_cart_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "SharedCartItem_shared_cart_id_fkey" FOREIGN KEY ("shared_cart_id") REFERENCES "SharedCart"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SharedCartItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "SharedCart_expires_at_idx" ON "SharedCart"("expires_at");
CREATE INDEX "SharedCartItem_shared_cart_id_idx" ON "SharedCartItem"("shared_cart_id");
CREATE UNIQUE INDEX "SharedCartItem_shared_cart_id_product_id_key" ON "SharedCartItem"("shared_cart_id", "product_id");

INSERT INTO "DiscountRule" ("min_quantity", "percent", "is_active") VALUES
(10, 5.00, true), (20, 10.00, true), (40, 15.00, true);
