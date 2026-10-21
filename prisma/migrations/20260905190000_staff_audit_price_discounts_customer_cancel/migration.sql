ALTER TABLE "User"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "can_manage_orders" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_manage_catalog" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_manage_discounts" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_manage_campaigns" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DiscountRule" ADD COLUMN "min_subtotal" DECIMAL(12,2);
UPDATE "DiscountRule" SET "min_subtotal" = "min_quantity" * 1000;
ALTER TABLE "DiscountRule" ALTER COLUMN "min_subtotal" SET NOT NULL;
ALTER TABLE "DiscountRule" DROP CONSTRAINT IF EXISTS "DiscountRule_min_quantity_key";
ALTER TABLE "DiscountRule" DROP COLUMN "min_quantity";
CREATE UNIQUE INDEX "DiscountRule_min_subtotal_key" ON "DiscountRule"("min_subtotal");

ALTER TABLE "Order"
  ADD COLUMN "assigned_manager_id" INTEGER,
  ADD COLUMN "assigned_at" TIMESTAMP(3),
  ADD COLUMN "credited_manager_id" INTEGER,
  ADD COLUMN "completed_at" TIMESTAMP(3),
  ADD COLUMN "cancelled_at" TIMESTAMP(3),
  ADD COLUMN "cancelled_by_customer" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OrderStatusHistory" ADD COLUMN "change_source" TEXT NOT NULL DEFAULT 'staff';

UPDATE "Order" SET "completed_at" = "created_at" WHERE "status" = 'completed' AND "completed_at" IS NULL;
UPDATE "Order" SET "cancelled_at" = "created_at" WHERE "status" = 'cancelled' AND "cancelled_at" IS NULL;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_assigned_manager_id_fkey" FOREIGN KEY ("assigned_manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Order_credited_manager_id_fkey" FOREIGN KEY ("credited_manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderStatusHistory"
  ADD CONSTRAINT "OrderStatusHistory_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Order_assigned_manager_id_idx" ON "Order"("assigned_manager_id");
CREATE INDEX "Order_credited_manager_id_idx" ON "Order"("credited_manager_id");
CREATE INDEX "OrderStatusHistory_changed_by_idx" ON "OrderStatusHistory"("changed_by");

CREATE TABLE "AuditLog" (
  "id" SERIAL NOT NULL,
  "actor_user_id" INTEGER,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" INTEGER,
  "entity_label" TEXT,
  "details" JSONB,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "AuditLog_actor_user_id_idx" ON "AuditLog"("actor_user_id");
CREATE INDEX "AuditLog_entity_type_entity_id_idx" ON "AuditLog"("entity_type", "entity_id");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");
