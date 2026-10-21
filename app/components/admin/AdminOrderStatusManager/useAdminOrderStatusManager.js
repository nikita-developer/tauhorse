export const useAdminOrderStatusManager = props => {
    const orders_store = useOrdersStore()
  const selected_status = ref('')
  const is_updating = ref(false)
  const notifications = useNotificationsStore()

  const normalized_options = computed(() => {
    if (Array.isArray(orders_store.status_options)) {
      return orders_store.status_options
    }

    if (Array.isArray(orders_store.status_options?.available_next_statuses)) {
      return orders_store.status_options.available_next_statuses
    }

    return []
  })

  const updateStatus = async () => {
    if (is_updating.value) return
    is_updating.value = true
    try {
      await orders_store.updateOrderStatus(props.order_id, selected_status.value)
      await Promise.all([orders_store.fetchAdminOrder(props.order_id), orders_store.fetchOrderHistory(props.order_id), orders_store.fetchOrderActivity(props.order_id), orders_store.fetchStatusOptions(props.order_id)])
      selected_status.value = ''
      notifications.success('Статус заказа обновлён')
    } catch (error) {
      notifications.error(error?.data?.message || 'Не удалось обновить статус')
    } finally {
      is_updating.value = false
    }
  }

  onMounted(async () => {
    await orders_store.fetchStatusOptions(props.order_id)
    selected_status.value = ''
  })

  return {
    selected_status,
    normalized_options,
    updateStatus,
    is_updating
  }
}
