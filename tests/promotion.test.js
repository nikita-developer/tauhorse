import test from 'node:test'
import assert from 'node:assert/strict'
import {isPromotionActive, getEffectiveProductPrice} from '../server/utils/promotion.js'

test('promotion is active inside configured period', () => {
  const p={price:1000,sale_percent:20,sale_starts_at:new Date('2026-09-01'),sale_ends_at:new Date('2026-09-10')}
  assert.equal(isPromotionActive(p,new Date('2026-09-05')),true)
  assert.equal(getEffectiveProductPrice(p,new Date('2026-09-05')),800)
})
test('future promotion does not change price',()=>{const p={price:1000,sale_percent:20,sale_starts_at:new Date('2026-10-01')};assert.equal(getEffectiveProductPrice(p,new Date('2026-09-05')),1000)})
test('expired promotion does not change price',()=>{const p={price:1000,sale_percent:20,sale_ends_at:new Date('2026-09-01')};assert.equal(getEffectiveProductPrice(p,new Date('2026-09-05')),1000)})
test('zero promotion does not change price',()=>assert.equal(getEffectiveProductPrice({price:999.99,sale_percent:0}),999.99))
test('promotion price rounds to cents',()=>assert.equal(getEffectiveProductPrice({price:999.99,sale_percent:15}),849.99))
test('promotion without dates stays active until disabled',()=>assert.equal(getEffectiveProductPrice({price:2000,sale_percent:12},new Date('2026-09-05')),1760))
test('promotion end boundary is exclusive',()=>assert.equal(isPromotionActive({price:100,sale_percent:10,sale_ends_at:new Date('2026-09-05T10:00:00Z')},new Date('2026-09-05T10:00:00Z')),false))
