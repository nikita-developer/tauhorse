import { computed, ref, watch } from 'vue'
import { useCartStore } from '~/stores/cart'
import {useNotificationsStore} from '~/stores/notifications'
import {getApiErrorMessage} from '~/utils/api'
import {useDelayedPending} from '~/composables/useDelayedPending'

export const useCartItemCard = props => {
  const cart_store = useCartStore()
  const notifications = useNotificationsStore()
  const local_quantity = ref(Number(props.item.quantity) || 1)
  const is_updating = ref(false)
  const is_removing = ref(false)
  const {is_visible: show_saving, start: startSaving, finish: finishSaving} = useDelayedPending({delay: 220, minimum: 300})
  const local_total = computed(() => Number(props.item.product.effective_price ?? props.item.product.price ?? 0) * local_quantity.value)
  let queued_quantity = null

  const product_image = computed(() => {
    const direct_image =
        props.item.product.media?.find(item => item.media_type === 'image')?.url ||
        props.item.product.image ||
        props.item.product.image_url ||
        props.item.product.preview_image ||
        props.item.product.photo ||
        ''

    if (direct_image) {
      return direct_image
    }

    return ''
  })

  let update_timeout = null

  const syncQuantity = async quantity => {
    const safe_quantity = Math.max(1, Number(quantity) || 1)

    if (safe_quantity === Number(props.item.quantity)) {
      return
    }

    if (is_updating.value) {
      queued_quantity = safe_quantity
      return
    }

    is_updating.value = true
    startSaving()
    try {
      await cart_store.updateItem(props.item.product.id, safe_quantity)
    } catch (error) {
      local_quantity.value = Math.max(1, Number(props.item.quantity) || 1)
      notifications.error(getApiErrorMessage(error) || 'Не удалось изменить количество')
    } finally {
      await finishSaving()
      is_updating.value = false
      if (queued_quantity !== null) {
        const next_quantity = queued_quantity
        queued_quantity = null
        await syncQuantity(next_quantity)
      }
    }
  }

  const scheduleUpdate = quantity => {
    clearTimeout(update_timeout)

    update_timeout = setTimeout(async () => {
      await syncQuantity(quantity)
    }, 340)
  }

  const handleInputChange = async () => {
    local_quantity.value = Math.max(1, Number(local_quantity.value) || 1)
    clearTimeout(update_timeout)
    await syncQuantity(local_quantity.value)
  }

  const increaseQuantity = () => {
    local_quantity.value = Math.max(1, Number(local_quantity.value) || 1) + 1
  }

  const decreaseQuantity = () => {
    const next_quantity = Math.max(1, (Number(local_quantity.value) || 1) - 1)
    local_quantity.value = next_quantity
  }

  const removeItem = async () => {
    clearTimeout(update_timeout)
    if (is_removing.value) return
    is_removing.value = true
    try {
      await cart_store.removeItem(props.item.product.id)
      notifications.info('Товар удалён из корзины')
    } catch (error) {
      notifications.error(getApiErrorMessage(error) || 'Не удалось удалить товар')
    } finally {
      is_removing.value = false
    }
  }

  watch(
      () => props.item.quantity,
      new_quantity => {
        if (is_updating.value || queued_quantity !== null) return
        local_quantity.value = Math.max(1, Number(new_quantity) || 1)
      }
  )

  watch(local_quantity, new_quantity => {
    const safe_quantity = Math.max(1, Number(new_quantity) || 1)

    if (safe_quantity !== new_quantity) {
      local_quantity.value = safe_quantity
      return
    }

    scheduleUpdate(safe_quantity)
  })

  return {
    local_quantity,
    product_image,
    handleInputChange,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    is_updating,
    is_removing,
    show_saving,
    local_total
  }
}
