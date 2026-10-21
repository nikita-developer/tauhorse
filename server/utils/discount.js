import {roundMoney} from './validation.js'

export const selectDiscountRule = (rules, subtotal) => {
  const amount = Number(subtotal)
  if (!Number.isFinite(amount) || amount < 0) return null
  return [...(rules || [])]
    .filter(rule => rule?.is_active !== false && Number(rule.min_subtotal) <= amount && Number(rule.percent) > 0)
    .sort((a, b) => Number(b.min_subtotal) - Number(a.min_subtotal))[0] || null
}

export const calculateDiscount = (subtotal, rules) => {
  const normalized = roundMoney(Number(subtotal) || 0)
  const rule = selectDiscountRule(rules, normalized)
  const percent = rule ? Math.max(0, Math.round(Number(rule.percent))) : 0
  const amount = roundMoney(normalized * percent / 100)
  return {percent, amount, total_after_discount: roundMoney(normalized - amount), rule}
}
