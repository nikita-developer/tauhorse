import {computed, onMounted, ref, watch} from 'vue'
import {useCartStore} from '~/stores/cart'
import {useNotificationsStore} from '~/stores/notifications'
import {getApiErrorMessage} from '~/utils/api'

export const useProductCard = props => {
  const cart_store = useCartStore()
  const notifications = useNotificationsStore()
  const is_updating = ref(false)
  const media_index = ref(0)
  const media_direction = ref('next')
  const failed_media = ref([])
  const touch_start_x = ref(0)
  const did_swipe = ref(false)

  const media_items = computed(() => {
    const seen = new Set()
    const items = []
    for (const media of Array.isArray(props.product.media) ? props.product.media : []) {
      const url = String(media?.url || '').trim()
      if (!url || seen.has(url) || failed_media.value.includes(url)) continue
      seen.add(url)
      items.push({url, type: media?.media_type === 'video' ? 'video' : 'image'})
    }
    const fallback = props.product.image || props.product.image_url || props.product.preview_image || props.product.photo || ''
    if (fallback && !seen.has(fallback) && !failed_media.value.includes(fallback)) items.push({url: fallback, type: 'image'})
    return items
  })

  const current_media = computed(() => {
    if (!media_items.value.length) return null
    const safeIndex = Math.min(media_index.value, media_items.value.length - 1)
    return media_items.value[safeIndex] || null
  })
  const product_video = computed(() => current_media.value?.type === 'video' ? current_media.value.url : '')
  const product_image = computed(() => current_media.value?.type === 'image' ? current_media.value.url : '')
  const has_multiple_media = computed(() => media_items.value.length > 1)
  const media_key = computed(() => current_media.value ? `${current_media.value.type}:${current_media.value.url}` : `empty:${props.product.id}`)
  const media_transition_name = computed(() => media_direction.value === 'prev' ? 'catalog-media-prev' : 'catalog-media-next')
  const media_position = computed(() => media_items.value.length ? `${Math.min(media_index.value + 1, media_items.value.length)}/${media_items.value.length}` : '')

  const setMediaIndex = (index, direction = 'next') => {
    const total = media_items.value.length
    if (!total) return
    media_direction.value = direction
    media_index.value = (index + total) % total
  }
  const nextMedia = () => setMediaIndex(media_index.value + 1, 'next')
  const previousMedia = () => setMediaIndex(media_index.value - 1, 'prev')
  const handleTouchStart = event => { touch_start_x.value = Number(event.touches?.[0]?.clientX || 0); did_swipe.value = false }
  const handleTouchEnd = event => {
    if (!has_multiple_media.value) return
    const endX = Number(event.changedTouches?.[0]?.clientX || 0)
    const delta = endX - touch_start_x.value
    if (Math.abs(delta) < 42) return
    did_swipe.value = true
    window.setTimeout(() => { did_swipe.value = false }, 350)
    if (delta < 0) nextMedia()
    else previousMedia()
  }
  const handleMediaLinkClick = event => {
    if (!did_swipe.value) return
    event.preventDefault()
    event.stopPropagation()
    window.setTimeout(() => { did_swipe.value = false }, 0)
  }

  const formatted_price = computed(() => {
    const price_number = Number(props.product.effective_price ?? props.product.price)
    if (Number.isNaN(price_number)) return `${props.product.price} ₽`
    return `${new Intl.NumberFormat('ru-RU').format(price_number)} ₽`
  })

  const cart_item = computed(() => cart_store.items.find(item => Number(item.product_id || item.product?.id) === Number(props.product.id)) || null)
  const cart_quantity = computed(() => Number(cart_item.value?.quantity || 0))
  const is_in_cart = computed(() => cart_quantity.value > 0)
  const can_increase = computed(() => cart_quantity.value < Number(props.product.stock || 0))

  const addToCart = async () => {
    if (is_updating.value || props.product.stock <= 0) return
    is_updating.value = true
    try {
      await cart_store.addItem(props.product.id, 1)
      notifications.success(`${props.product.name} — в корзине`)
    } catch (error) {
      notifications.error(getApiErrorMessage(error) || 'Не удалось добавить товар')
    } finally { is_updating.value = false }
  }
  const increaseQuantity = async () => {
    if (is_updating.value || !can_increase.value) return
    is_updating.value = true
    try { await cart_store.updateItem(props.product.id, cart_quantity.value + 1) }
    catch (error) { notifications.error(getApiErrorMessage(error) || 'Не удалось изменить количество') }
    finally { is_updating.value = false }
  }
  const decreaseQuantity = async () => {
    if (is_updating.value || !is_in_cart.value) return
    is_updating.value = true
    try {
      if (cart_quantity.value <= 1) await cart_store.removeItem(props.product.id)
      else await cart_store.updateItem(props.product.id, cart_quantity.value - 1)
    } catch (error) { notifications.error(getApiErrorMessage(error) || 'Не удалось изменить количество') }
    finally { is_updating.value = false }
  }

  const handleImageError = () => {
    const url = current_media.value?.url
    if (!url) return
    failed_media.value = [...failed_media.value, url]
    media_index.value = 0
  }

  watch(() => props.product.id, () => { media_index.value = 0; failed_media.value = [] })
  watch(() => media_items.value.length, length => { if (media_index.value >= length) media_index.value = Math.max(0, length - 1) })
  onMounted(() => { cart_store.ensureCartLoaded().catch(() => {}) })

  return {
    product_video,
    product_image,
    media_key,
    media_transition_name,
    has_multiple_media,
    media_position,
    nextMedia,
    previousMedia,
    handleTouchStart,
    handleTouchEnd,
    handleMediaLinkClick,
    formatted_price,
    regular_price: computed(() => Number(props.product.regular_price ?? props.product.price)),
    promotion_active: computed(() => props.product.promotion_active === true),
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    cart_quantity,
    is_in_cart,
    can_increase,
    is_updating,
    handleImageError
  }
}
