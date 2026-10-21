const delivery_labels = {
  pickup: 'Самовывоз',
  seller_courier: 'Доставка продавцом',
  russian_post: 'Почта России',
  pickup_point: 'Пункт выдачи / сервис доставки',
  transport_company: 'Транспортная компания',
  other: 'Другой способ по согласованию',
  courier: 'Курьерская доставка'
}

export const getDeliveryMethodLabel = method => delivery_labels[method] || 'Доставка по согласованию'

export const delivery_methods = [
  'pickup',
  'seller_courier',
  'russian_post',
  'pickup_point',
  'transport_company',
  'other',
  // legacy value kept for existing orders created before flexible delivery was introduced
  'courier'
]

export const calculateDeliveryPrice = (subtotal, method) => {
  const amount = Number(subtotal)
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Некорректная сумма заказа')
  if (!delivery_methods.includes(method)) throw new Error('Некорректный способ доставки')
  // Delivery is agreed after checkout. The site never silently adds an estimated tariff
  // to the order total before the buyer has confirmed it.
  return 0
}
