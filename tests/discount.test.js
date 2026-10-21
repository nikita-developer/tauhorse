import test from 'node:test'
import assert from 'node:assert/strict'
import {calculateDiscount,selectDiscountRule} from '../server/utils/discount.js'
const rules=[{min_subtotal:10000,percent:5,is_active:true},{min_subtotal:20000,percent:10,is_active:true},{min_subtotal:40000,percent:15,is_active:true}]
test('no discount below first price tier',()=>assert.equal(calculateDiscount(9999,rules).amount,0))
test('5 percent from 10000 rubles',()=>assert.deepEqual(calculateDiscount(10000,rules),{percent:5,amount:500,total_after_discount:9500,rule:rules[0]}))
test('highest eligible price tier wins',()=>assert.equal(selectDiscountRule(rules,25000).percent,10))
test('40000 rubles receives 15 percent',()=>assert.equal(calculateDiscount(40000,rules).amount,6000))
test('inactive tier is ignored',()=>assert.equal(selectDiscountRule([{min_subtotal:1,percent:20,is_active:false}],5),null))
test('discount rounds to cents',()=>assert.equal(calculateDiscount(10000.01,rules).amount,500))
