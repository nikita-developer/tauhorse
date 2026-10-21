export const order_statuses = {
  pending: 'pending',
  confirmed: 'confirmed',
  paid: 'paid',
  processing: 'processing',
  shipped: 'shipped',
  delivered: 'delivered',
  completed: 'completed',
  cancelled: 'cancelled'
}

export const allowed_order_statuses = Object.values(order_statuses)

export const order_status_labels = {
  pending: 'Получен',
  confirmed: 'Подтверждён',
  paid: 'Оплачен',
  processing: 'Собирается',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  completed: 'Завершён',
  cancelled: 'Отменён'
}

export const getOrderStatusLabel = status => order_status_labels[status] || status

// Заказ считается подтверждённым только после связи с покупателем.
// Для оплаты при получении подтверждённый заказ можно сразу передать в сборку;
// для предоплаты остаётся отдельный шаг «Оплачен».
export const allowed_status_transitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['paid', 'processing', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: []
}

export const isValidOrderStatus = status => allowed_order_statuses.includes(status)

export const canChangeOrderStatus = (current_status, next_status) => {
  const allowed_next_statuses = allowed_status_transitions[current_status] || []
  return allowed_next_statuses.includes(next_status)
}

export const canCustomerCancelOrder = order => typeof order === 'string' ? order === 'pending' : Boolean(order?.status === 'pending' && !order?.assigned_manager_id)
export const resolveOrderCreditManagerId = ({assigned_manager_id, actor} = {}) => {
  const assigned=Number(assigned_manager_id)
  if(Number.isSafeInteger(assigned)&&assigned>0)return assigned
  return actor?.role==='manager'&&Number.isSafeInteger(Number(actor.id))?Number(actor.id):null
}
