import test from 'node:test'
import assert from 'node:assert/strict'
import {sortCartItems} from '../app/utils/cart-items.js'

test('changing quantity or price never changes order', () => {
  const original = [{id: 31, quantity: 1}, {id: 12, quantity: 2}, {id: 20, quantity: 3}]
  const after = [{id: 20, quantity: 30}, {id: 31, quantity: 1}, {id: 12, quantity: 100}]
  assert.deepEqual(sortCartItems(original).map(item => item.id), [12, 20, 31])
  assert.deepEqual(sortCartItems(after).map(item => item.id), [12, 20, 31])
  assert.deepEqual(original.map(item => item.id), [31, 12, 20]) // getter does not mutate API result
})
test('empty carts and string IDs are supported', () => {
  assert.deepEqual(sortCartItems(null), [])
  assert.deepEqual(sortCartItems([{id: '10'}, {id: '2'}]).map(x => x.id), ['2','10'])
})
