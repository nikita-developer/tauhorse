export const orderStatusLabels = {
  pending: 'Получен',
  confirmed: 'Подтверждён',
  paid: 'Оплачен',
  processing: 'Собирается',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  completed: 'Завершён',
  cancelled: 'Отменён'
}

export const orderStatusOptions = Object.entries(orderStatusLabels).map(([value, label]) => ({value, label}))

export const getOrderStatusLabel = status => orderStatusLabels[status] || status || 'Неизвестный статус'
