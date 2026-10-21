import test from 'node:test'
import assert from 'node:assert/strict'
import {canChangeOrderStatus} from '../server/utils/order-status.js'

test('разрешает штатную последовательность заказа после связи с покупателем', () => {
  assert.equal(canChangeOrderStatus('pending', 'confirmed'), true)
  assert.equal(canChangeOrderStatus('confirmed', 'paid'), true)
  assert.equal(canChangeOrderStatus('confirmed', 'processing'), true)
  assert.equal(canChangeOrderStatus('paid', 'processing'), true)
  assert.equal(canChangeOrderStatus('processing', 'shipped'), true)
})

test('не позволяет пропустить подтверждение заказа', () => {
  assert.equal(canChangeOrderStatus('pending', 'paid'), false)
  assert.equal(canChangeOrderStatus('pending', 'processing'), false)
})

test('не позволяет повторно отменить заказ', () => {
  assert.equal(canChangeOrderStatus('cancelled', 'cancelled'), false)
  assert.equal(canChangeOrderStatus('completed', 'cancelled'), false)
})

test('возвращает русские подписи статусов', async () => {
  const {getOrderStatusLabel} = await import('../server/utils/order-status.js')
  assert.equal(getOrderStatusLabel('pending'), 'Получен')
  assert.equal(getOrderStatusLabel('confirmed'), 'Подтверждён')
  assert.equal(getOrderStatusLabel('processing'), 'Собирается')
  assert.equal(getOrderStatusLabel('cancelled'), 'Отменён')
})
