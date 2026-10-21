import {getEffectiveProductPrice} from './promotion.js'
import {roundMoney} from './validation.js'

const safeQuantity = quantity => Number(quantity || 0)

export const getCartLineTotal = (product, quantity) => roundMoney(getEffectiveProductPrice(product) * safeQuantity(quantity))

export const getCartRegularLineTotal = (product, quantity) => roundMoney(Number(product?.price || 0) * safeQuantity(quantity))

export const getCartSubtotal = items => roundMoney((items || []).reduce((total, item) => {
  if (item?.product?.is_deleted) return total
  return total + getCartLineTotal(item.product, item.quantity)
}, 0))

export const getCartRegularSubtotal = items => roundMoney((items || []).reduce((total, item) => {
  if (item?.product?.is_deleted) return total
  return total + getCartRegularLineTotal(item.product, item.quantity)
}, 0))

export const getCartPromotionSavings = items => roundMoney(Math.max(0, getCartRegularSubtotal(items) - getCartSubtotal(items)))
