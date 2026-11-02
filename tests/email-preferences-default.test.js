import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('both optional email preferences default to false in Prisma schema', () => {
  const schema = read('prisma/schema.prisma')
  assert.match(schema, /order_notifications_enabled\s+Boolean\s+@default\(false\)/)
  assert.match(schema, /marketing_emails_enabled\s+Boolean\s+@default\(false\)/)
})

test('one-time migration disables both preferences for existing users', () => {
  const sql = read('prisma/migrations/20261102190000_email_notifications_opt_in_default/migration.sql')
  assert.match(sql, /ALTER COLUMN "order_notifications_enabled" SET DEFAULT false/)
  assert.match(sql, /ALTER COLUMN "marketing_emails_enabled" SET DEFAULT false/)
  assert.match(sql, /"order_notifications_enabled" = false/)
  assert.match(sql, /"marketing_emails_enabled" = false/)
  assert.match(sql, /"marketing_consent_revoked_at"/)
})

test('account screen defaults both switches to off, but reflects actual saved preferences', () => {
  const vue = read('app/pages/account/index.vue')
  assert.match(vue, /notifications_enabled = ref\(auth_store\.user\?\.order_notifications_enabled === true\)/)
  assert.match(vue, /marketing_enabled = ref\(auth_store\.user\?\.marketing_emails_enabled === true\)/)
  assert.match(vue, /auth_store\.user\?\.marketing_emails_enabled/)
  assert.match(vue, /@change="saveNotifications"/)
  assert.match(vue, /@change="saveMarketing"/)
})

test('API exposes opt-in as true only when saved true', () => {
  const js = read('server/services/auth.service.js')
  assert.doesNotMatch(js, /user\.order_notifications_enabled !== false/)
  assert.equal((js.match(/order_notifications_enabled: user\.order_notifications_enabled === true/g) || []).length, 3)
  assert.equal((js.match(/marketing_emails_enabled: user\.marketing_emails_enabled === true/g) || []).length, 3)
})

test('order status email requires explicit user opt-in, not guest fallback', () => {
  const js = read('server/services/order.service.js')
  assert.match(js, /should_send_status_email=updated_order\.user\?\.order_notifications_enabled === true/)
  assert.match(js, /if\(should_send_status_email\) mail_service\.sendOrderStatusEmail/)
})
