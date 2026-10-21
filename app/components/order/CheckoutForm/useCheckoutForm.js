export const useCheckoutForm = () => {
  const draft_key = 'tauhorse:checkout-draft:v1'
  const orders_store = useOrdersStore()
  const auth_store = useAuthStore()
  const cart_store = useCartStore()
  const notifications = useNotificationsStore()
  const error_message = ref('')
  const is_submitting = ref(false)
  const form_state = reactive({
    email: auth_store.user?.email || '',
    name: '',
    phone: '',
    address: '',
    postal_code: '',
    delivery_method: 'seller_courier',
    comment: '',
    terms_accepted: false,
    idempotency_key: crypto.randomUUID()
  })

  onMounted(async () => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(draft_key) || 'null')
      if (draft && typeof draft === 'object') {
        for (const key of ['email', 'name', 'phone', 'address', 'postal_code', 'delivery_method', 'comment', 'terms_accepted']) {
          if (draft[key] !== undefined) form_state[key] = draft[key]
        }
      }
      if (auth_store.user?.email) form_state.email = auth_store.user.email
    } catch {
      sessionStorage.removeItem(draft_key)
    }

    try {
      await cart_store.ensureCartLoaded()
      if (!cart_store.items.length) {
        await navigateTo('/cart', {replace: true})
      }
    } catch {
      // Ошибку загрузки корзины покажет API при оформлении; не блокируем форму заранее.
    }
  })

  watch(form_state, state => {
    if (!import.meta.client) return
    const {idempotency_key: _key, ...draft} = {...state}
    sessionStorage.setItem(draft_key, JSON.stringify(draft))
  }, {deep: true})

  const getOrderLink = order => {
    if (!order?.id) return '/orders'
    if (order.access_token) {
      return `/orders/${order.id}#token=${encodeURIComponent(order.access_token)}`
    }
    return `/orders/${order.id}`
  }

  const submitOrder = async () => {
    if (is_submitting.value) return
    is_submitting.value = true
    error_message.value = ''
    try {
      const response = await orders_store.createOrder({...form_state})
      if (import.meta.client) sessionStorage.removeItem(draft_key)
      notifications.success(`Заказ №${response.id} получен. Мы свяжемся для подтверждения`)

      await cart_store.fetchCart()
      if (auth_store.is_authenticated) await orders_store.fetchMyOrders()
      else await orders_store.fetchGuestOrders()

      await navigateTo(getOrderLink(response), {replace: true})
    } catch (error) {
      error_message.value = error?.data?.message || error?.response?._data?.message || 'Не удалось оформить заказ'
      notifications.error(error_message.value)
    } finally {
      is_submitting.value = false
    }
  }

  return {
    form_state,
    error_message,
    is_submitting,
    submitOrder
  }
}
