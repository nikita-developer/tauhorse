import test from 'node:test'
import assert from 'node:assert/strict'
import {calculateDeliveryPrice, delivery_methods} from '../server/utils/delivery.js'

test('доставка не добавляется в итог до согласования', () => {
  for (const method of delivery_methods) assert.equal(calculateDeliveryPrice(1250, method), 0)
})
test('неизвестный способ отклоняется', () => assert.throws(() => calculateDeliveryPrice(1000, 'drone')))
test('некорректная сумма отклоняется', () => assert.throws(() => calculateDeliveryPrice(-1, 'pickup')))
