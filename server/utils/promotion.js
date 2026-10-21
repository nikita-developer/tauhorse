import {roundMoney} from './validation.js'

const getPromotionPercent = product => Math.max(0, Math.round(Number(product?.sale_percent || 0)))

export const isPromotionActive = (product, now = new Date()) => {
  const percent = getPromotionPercent(product)
  if (!Number.isFinite(percent) || percent <= 0) return false
  if (product.sale_starts_at && new Date(product.sale_starts_at) > now) return false
  if (product.sale_ends_at && new Date(product.sale_ends_at) <= now) return false
  return true
}

export const getEffectiveProductPrice = (product, now = new Date()) => {
  const regular = Number(product?.price || 0)
  if (!isPromotionActive(product, now)) return roundMoney(regular)
  return roundMoney(regular * (1 - getPromotionPercent(product) / 100))
}

export const withPromotionPricing = (product, now = new Date()) => ({
  ...product,
  sale_percent: getPromotionPercent(product),
  regular_price: Number(product.price),
  effective_price: getEffectiveProductPrice(product, now),
  promotion_active: isPromotionActive(product, now)
})
