const deliveryLabels = {
  pickup: 'Самовывоз',
  seller_courier: 'Доставка продавцом',
  russian_post: 'Почта России',
  pickup_point: 'Пункт выдачи / сервис доставки',
  transport_company: 'Транспортная компания',
  other: 'Другой способ по согласованию',
  courier: 'Курьерская доставка'
}

export const getDeliveryMethodLabel = method => deliveryLabels[method] || 'Доставка по согласованию'
export const needsDeliveryDetails = method => method !== 'pickup'
export const usesPostalCode = method => ['russian_post', 'seller_courier', 'courier'].includes(method)

export const getDeliveryPriceLabel = order => {
  if (!order) return '—'
  if (order.delivery_method === 'pickup') return 'Без доплаты'
  if (order.delivery_price_confirmed !== true) return 'По согласованию'
  return `${new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 2}).format(Number(order.delivery_price || 0))} ₽`
}
