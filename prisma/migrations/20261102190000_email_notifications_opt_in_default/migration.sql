-- By request, both optional email subscriptions start disabled for all users.
-- Preserve explicit consent history while turning off existing marketing subscriptions.
-- Essential emails (order created, verification, password reset) are unaffected.
ALTER TABLE "User"
  ALTER COLUMN "order_notifications_enabled" SET DEFAULT false,
  ALTER COLUMN "marketing_emails_enabled" SET DEFAULT false;

UPDATE "User"
SET
  "order_notifications_enabled" = false,
  "marketing_emails_enabled" = false,
  "marketing_consent_revoked_at" = CASE
    WHEN "marketing_emails_enabled" = true THEN NOW()
    ELSE "marketing_consent_revoked_at"
  END
WHERE "order_notifications_enabled" = true OR "marketing_emails_enabled" = true;
