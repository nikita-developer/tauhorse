import test from 'node:test'
import assert from 'node:assert/strict'
import {allowed_order_statuses, isValidOrderStatus, canChangeOrderStatus} from '../server/utils/order-status.js'

test('известные статусы валидны, произвольные отклоняются', () => {
  for (const status of allowed_order_statuses) assert.equal(isValidOrderStatus(status), true)
  assert.equal(isValidOrderStatus('hacked'), false)
})

test('нельзя перескакивать через этапы или возвращать завершённый заказ назад', () => {
  assert.equal(canChangeOrderStatus('pending', 'shipped'), false)
  assert.equal(canChangeOrderStatus('processing', 'paid'), false)
  assert.equal(canChangeOrderStatus('completed', 'pending'), false)
  assert.equal(canChangeOrderStatus('cancelled', 'processing'), false)
})

test('customer can cancel only a new pending order', async()=>{
  const {canCustomerCancelOrder}=await import('../server/utils/order-status.js')
  assert.equal(canCustomerCancelOrder({status:'pending',assigned_manager_id:null}),true)
  assert.equal(canCustomerCancelOrder({status:'pending',assigned_manager_id:5}),false)
  for(const status of ['confirmed','paid','processing','shipped','delivered','completed','cancelled'])assert.equal(canCustomerCancelOrder({status,assigned_manager_id:null}),false)
})

test('successful order credit is frozen to assigned manager', async()=>{
  const {resolveOrderCreditManagerId}=await import('../server/utils/order-status.js')
  assert.equal(resolveOrderCreditManagerId({assigned_manager_id:12,actor:{id:5,role:'manager'}}),12)
  assert.equal(resolveOrderCreditManagerId({assigned_manager_id:null,actor:{id:5,role:'manager'}}),5)
  assert.equal(resolveOrderCreditManagerId({assigned_manager_id:null,actor:{id:1,role:'admin'}}),null)
})
