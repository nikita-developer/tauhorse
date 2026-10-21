import test from 'node:test'
import assert from 'node:assert/strict'
import {getCartLineTotal,getCartRegularLineTotal,getCartSubtotal,getCartRegularSubtotal,getCartPromotionSavings} from '../server/utils/cart-pricing.js'

test('cart line uses active promotional price',()=>assert.equal(getCartLineTotal({price:2000,sale_percent:15},2),3400))
test('cart regular line ignores promotion for breakdown',()=>assert.equal(getCartRegularLineTotal({price:2000,sale_percent:15},2),4000))
test('cart subtotal mixes regular and promotional items',()=>{
  const items=[{quantity:2,product:{price:1000,sale_percent:10}},{quantity:1,product:{price:500,sale_percent:0}}]
  assert.equal(getCartSubtotal(items),2300)
  assert.equal(getCartRegularSubtotal(items),2500)
  assert.equal(getCartPromotionSavings(items),200)
})
test('deleted products are excluded from cart subtotal',()=>{
  const items=[{quantity:3,product:{price:1000,is_deleted:true}}]
  assert.equal(getCartSubtotal(items),0)
  assert.equal(getCartRegularSubtotal(items),0)
  assert.equal(getCartPromotionSavings(items),0)
})
