import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {selectDiscountRule,calculateDiscount} from '../server/utils/discount.js'
import {hasStaffPermission} from '../server/utils/permissions.js'
import {canCustomerCancelOrder,resolveOrderCreditManagerId} from '../server/utils/order-status.js'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')

test('cart discount tiers are selected by money subtotal, not item quantity',()=>{
  const rules=[
    {min_subtotal:10000,percent:5,is_active:true},
    {min_subtotal:20000,percent:10,is_active:true},
    {min_subtotal:40000,percent:15,is_active:true}
  ]
  assert.equal(selectDiscountRule(rules,9999),null)
  assert.equal(Number(selectDiscountRule(rules,10000).percent),5)
  assert.equal(Number(selectDiscountRule(rules,39999).percent),10)
  assert.equal(Number(selectDiscountRule(rules,40000).percent),15)
  const calculated=calculateDiscount(20000,rules)
  assert.equal(calculated.percent,10)
  assert.equal(calculated.amount,2000)
  assert.equal(calculated.total_after_discount,18000)
  assert.equal(Number(calculated.rule.min_subtotal),20000)
})

test('manager permissions are granular and admin always has staff access',()=>{
  const manager={role:'manager',is_active:true,can_manage_orders:true,can_manage_catalog:false}
  assert.equal(hasStaffPermission(manager,'can_manage_orders'),true)
  assert.equal(hasStaffPermission(manager,'can_manage_catalog'),false)
  assert.equal(hasStaffPermission({...manager,is_active:false},'can_manage_orders'),false)
  assert.equal(hasStaffPermission({role:'admin',is_active:true},'can_manage_campaigns'),true)
})

test('customer may self-cancel only a new unassigned order',()=>{
  assert.equal(canCustomerCancelOrder({status:'pending',assigned_manager_id:null}),true)
  assert.equal(canCustomerCancelOrder({status:'pending',assigned_manager_id:7}),false)
  assert.equal(canCustomerCancelOrder({status:'paid',assigned_manager_id:null}),false)
})

test('successful order credit is frozen to the responsible manager',()=>{
  assert.equal(resolveOrderCreditManagerId({assigned_manager_id:8,actor:{id:3,role:'admin'}}),8)
  assert.equal(resolveOrderCreditManagerId({assigned_manager_id:null,actor:{id:4,role:'manager'}}),4)
  assert.equal(resolveOrderCreditManagerId({assigned_manager_id:null,actor:{id:3,role:'admin'}}),null)
})

test('v7 migration creates staff permissions, money discounts, audit and customer cancellation fields',()=>{
  const schema=readFileSync(resolve(root,'prisma/schema.prisma'),'utf8')
  const migrationPath=resolve(root,'prisma/migrations/20260905190000_staff_audit_price_discounts_customer_cancel/migration.sql')
  assert.ok(existsSync(migrationPath))
  const migration=readFileSync(migrationPath,'utf8')
  assert.match(schema,/min_subtotal Decimal @unique/)
  assert.doesNotMatch(schema,/min_quantity/)
  for(const field of ['can_manage_orders','can_manage_catalog','can_manage_discounts','can_manage_campaigns','assigned_manager_id','credited_manager_id','cancelled_by_customer']) assert.match(schema,new RegExp(field))
  assert.match(schema,/model AuditLog/)
  assert.match(migration,/CREATE TABLE "AuditLog"/)
  assert.match(migration,/DROP COLUMN "min_quantity"/)
  assert.match(migration,/UPDATE "Order" SET "completed_at"/)
})

test('management and customer-cancel endpoints exist',()=>{
  for(const rel of [
    'server/api/staff/admin/users/index.get.js',
    'server/api/staff/admin/users/[id]/index.patch.js',
    'server/api/staff/admin/managers.get.js',
    'server/api/audit/admin/index.get.js',
    'server/api/orders/[id]/assign/index.post.js',
    'server/api/orders/[id]/cancel/index.post.js'
  ]) assert.ok(existsSync(resolve(root,rel)),rel)
})

test('cart waits for auth restoration before fetching persisted user cart',()=>{
  const cart=readFileSync(resolve(root,'app/stores/cart.js'),'utf8')
  assert.match(cart,/if \(!auth_store\.is_initialized\)\s*(?:\{\s*)?await auth_store\.initAuth\(\)/s)
})

test('admin order list exposes current manager and frozen success credit with filters',()=>{
  const page=readFileSync(resolve(root,'app/pages/admin/orders.vue'),'utf8')
  const api=readFileSync(resolve(root,'server/api/orders/admin/all.get.js'),'utf8')
  const service=readFileSync(resolve(root,'server/services/order.service.js'),'utf8')
  assert.match(page,/Ответственный сейчас/)
  assert.match(page,/Зачтён менеджеру/)
  assert.match(page,/Зачёт за результат/)
  assert.match(page,/credited_manager_id/)
  assert.match(page,/Без менеджера/)
  assert.match(page,/Завершённые/)
  assert.match(api,/credited_manager_id/)
  assert.match(service,/credited_manager_id/)
})

test('order detail has processing audit timeline and assignment history endpoint',()=>{
  const detail=readFileSync(resolve(root,'app/pages/admin/orders/[id].vue'),'utf8')
  const store=readFileSync(resolve(root,'app/stores/orders.js'),'utf8')
  const service=readFileSync(resolve(root,'server/services/order.service.js'),'utf8')
  const endpoint=resolve(root,'server/api/orders/[id]/activity.get.js')
  assert.ok(existsSync(endpoint))
  assert.match(detail,/История обработки/)
  assert.match(detail,/Сейчас обрабатывает/)
  assert.match(detail,/Зачёт за успешный заказ/)
  assert.match(detail,/fetchOrderActivity/)
  assert.match(store,/fetchOrderActivity/)
  assert.match(service,/getOrderActivity/)
  assert.match(service,/from_manager_email/)
  assert.match(service,/to_manager_email/)
})
