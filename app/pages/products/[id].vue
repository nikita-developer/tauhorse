<template>
  <section class="product-page">
    <div class="container">
      <div v-if="status === 'pending'" class="product-page__skeleton" aria-label="Загружаем товар">
        <div class="skeleton product-page__skeleton-media"></div>
        <div class="product-page__skeleton-copy">
          <div class="skeleton product-page__skeleton-line product-page__skeleton-line--small"></div>
          <div class="skeleton product-page__skeleton-line product-page__skeleton-line--title"></div>
          <div class="skeleton product-page__skeleton-line"></div>
          <div class="skeleton product-page__skeleton-line"></div>
          <div class="skeleton product-page__skeleton-box"></div>
        </div>
      </div>

      <template v-else-if="products_store.product">
        <section class="product-page__top">
          <div class="product-page__media-column">
            <div
              class="product-page__media"
              :class="{'has-navigation': has_multiple_media}"
              :tabindex="has_multiple_media ? 0 : undefined"
              :aria-label="has_multiple_media ? `Галерея товара. Медиа ${selected_media_index + 1} из ${media_items.length}` : undefined"
              @keydown.left.prevent="previousMedia"
              @keydown.right.prevent="nextMedia"
              @touchstart.passive="handleMediaTouchStart"
              @touchend.passive="handleMediaTouchEnd"
            >
              <video
                v-if="selected_media?.media_type === 'video'"
                :key="selected_media_key"
                :src="selected_media.url"
                class="product-page__image product-page__video is-loaded"
                controls
                playsinline
                preload="metadata"
              ></video>
              <img
                v-else-if="product_image"
                :key="selected_media_key"
                :src="product_image"
                :alt="products_store.product.name"
                class="product-page__image"
                loading="eager"
                fetchpriority="high"
                decoding="async"
                :class="{'is-loaded': image_is_loaded}"
                @load="image_is_loaded = true"
                @error="handleImageError"
              >
              <div v-if="product_image && selected_media?.media_type !== 'video' && !image_is_loaded" class="skeleton product-page__image-loader" aria-hidden="true"></div>
              <div v-if="!product_image && selected_media?.media_type !== 'video'" class="product-page__image product-page__image--placeholder" role="img" :aria-label="`Фотография товара ${products_store.product.name} пока не загружена`">Фото скоро появится</div>

              <button v-if="has_multiple_media" type="button" class="product-page__media-nav product-page__media-nav--prev" aria-label="Предыдущее изображение" @click.stop="previousMedia">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button v-if="has_multiple_media" type="button" class="product-page__media-nav product-page__media-nav--next" aria-label="Следующее изображение" @click.stop="nextMedia">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
              </button>
              <span v-if="has_multiple_media" class="product-page__media-counter" aria-hidden="true">{{ selected_media_index + 1 }} / {{ media_items.length }}</span>

              <div class="product-page__badges">
                <span v-if="products_store.product.promotion_active" class="product-page__badge product-page__badge--sale">{{ products_store.product.promo_label || `−${Number(products_store.product.sale_percent)}%` }}</span>
                <span v-if="products_store.product.is_featured" class="product-page__badge product-page__badge--featured">Рекомендуем</span>
              </div>
            </div>

            <div v-if="has_multiple_media" class="product-page__thumbs-shell" :class="{'has-controls': show_thumb_controls}">
              <button v-if="show_thumb_controls" type="button" class="product-page__thumbs-nav" aria-label="Прокрутить миниатюры назад" @click="scrollThumbs(-1)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <div ref="thumbs_track" class="product-page__thumbs" aria-label="Медиа товара">
                <button
                  v-for="(item,index) in media_items"
                  :key="item.id || `${item.url}-${index}`"
                  :data-media-index="index"
                  type="button"
                  class="product-page__thumb"
                  :class="{'is-active': selected_media_index === index}"
                  :aria-label="item.media_type === 'video' ? `Открыть видео ${index + 1}` : `Открыть изображение ${index + 1}`"
                  :aria-current="selected_media_index === index ? 'true' : undefined"
                  @click="selectMedia(index)"
                >
                  <video v-if="item.media_type === 'video'" :src="item.url" muted playsinline preload="metadata"></video>
                  <img v-else :src="item.url" alt="" loading="lazy" decoding="async">
                  <span v-if="item.media_type === 'video'" aria-hidden="true">▶</span>
                </button>
              </div>
              <button v-if="show_thumb_controls" type="button" class="product-page__thumbs-nav" aria-label="Прокрутить миниатюры вперёд" @click="scrollThumbs(1)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
              </button>
            </div>
          </div>

          <div class="product-page__summary">
            <div class="product-page__head">
              <p class="product-page__category">{{ products_store.product.category?.name || 'Без категории' }}</p>
              <h1 class="product-page__title">{{ products_store.product.name }}</h1>
              <p class="product-page__description">{{ products_store.product.description || 'Описание товара пока не заполнено.' }}</p>
            </div>

            <dl v-if="has_purchase_facts" class="product-page__facts">
              <div v-if="products_store.product.brand"><dt>Бренд</dt><dd>{{ products_store.product.brand }}</dd></div>
              <div v-if="products_store.product.package_weight_kg"><dt>Фасовка</dt><dd>{{ products_store.product.package_weight_kg }} кг</dd></div>
              <div v-if="products_store.product.country_of_origin"><dt>Производство</dt><dd>{{ products_store.product.country_of_origin }}</dd></div>
              <div v-if="products_store.product.shelf_life_months"><dt>Срок годности</dt><dd>{{ products_store.product.shelf_life_months }} мес.</dd></div>
            </dl>

            <div class="product-page__buybox">
              <div class="product-page__buybox-top">
                <div class="product-page__price-block">
                  <span class="product-page__meta-label">Цена</span>
                  <span v-if="products_store.product.promotion_active" class="product-page__old-price">{{ formatted_regular_price }}</span>
                  <strong class="product-page__price">{{ formatted_price }}</strong>
                  <small v-if="products_store.product.promotion_active" class="product-page__saving">Экономия {{ formatted_promotion_saving }}</small>
                </div>
                <div class="product-page__availability" :class="products_store.product.stock > 0 ? 'is-in-stock' : 'is-out-stock'">
                  <i aria-hidden="true"></i>
                  <div><span>Наличие</span><strong>{{ products_store.product.stock > 0 ? `В наличии: ${products_store.product.stock}` : 'Нет в наличии' }}</strong></div>
                </div>
              </div>

              <div v-if="products_store.product.promotion_active" class="product-page__promo-info">
                <strong>{{ products_store.product.promo_label || `Скидка ${Number(products_store.product.sale_percent)}%` }}</strong>
                <span>{{ promotion_period_text }}</span>
              </div>

              <DiscountTiers :rules="discount_rules" :subtotal="cart_store.subtotal" compact />

              <div class="product-page__actions">
                <button
                  v-if="!is_in_cart"
                  class="btn btn--primary product-page__button"
                  :class="{'is-loading': show_adding}"
                  :disabled="products_store.product.stock <= 0 || is_adding"
                  type="button"
                  @click="addToCart"
                >
                  {{ products_store.product.stock > 0 ? 'Добавить в корзину' : 'Нет в наличии' }}
                </button>

                <div v-else class="product-page__cart-control">
                  <span class="product-page__cart-label">В корзине</span>
                  <div class="product-page__quantity" aria-label="Количество товара в корзине">
                    <button type="button" :disabled="is_adding" aria-label="Уменьшить количество" @click="decreaseQuantity">−</button>
                    <strong aria-live="polite">{{ cart_quantity }}</strong>
                    <button type="button" :disabled="is_adding || !can_increase" aria-label="Увеличить количество" @click="increaseQuantity">+</button>
                  </div>
                </div>

                <NuxtLink v-if="is_in_cart" to="/cart" class="btn btn--secondary product-page__button">Открыть корзину</NuxtLink>
              </div>

              <p class="product-page__delivery-note">Способ, срок и стоимость доставки подтверждаются при оформлении заказа — до оплаты.</p>
            </div>
          </div>
        </section>

        <section v-if="has_usage_info" class="product-page__content" aria-labelledby="product-use-title">
          <div class="product-page__section-head">
            <span>Главное о товаре</span>
            <h2 id="product-use-title">Состав и применение</h2>
          </div>
          <div class="product-page__info-grid">
            <article v-if="products_store.product.composition" class="product-page__info-card">
              <span class="product-page__info-icon" aria-hidden="true">◌</span>
              <div><h3>Состав</h3><p>{{ products_store.product.composition }}</p></div>
            </article>
            <article v-if="products_store.product.feeding_guide" class="product-page__info-card product-page__info-card--wide">
              <span class="product-page__info-icon" aria-hidden="true">✓</span>
              <div><h3>Рекомендации по кормлению</h3><p>{{ products_store.product.feeding_guide }}</p></div>
            </article>
            <article v-if="products_store.product.storage_conditions" class="product-page__info-card">
              <span class="product-page__info-icon" aria-hidden="true">▣</span>
              <div><h3>Хранение</h3><p>{{ products_store.product.storage_conditions }}</p></div>
            </article>
            <article v-if="products_store.product.usage_restrictions" class="product-page__info-card">
              <span class="product-page__info-icon" aria-hidden="true">!</span>
              <div><h3>Особые указания</h3><p>{{ products_store.product.usage_restrictions }}</p></div>
            </article>
          </div>
        </section>

        <section v-if="has_technical_details" class="product-page__technical" aria-labelledby="product-tech-title">
          <div class="product-page__section-head">
            <span>Дополнительные сведения</span>
            <h2 id="product-tech-title">Производитель и идентификация</h2>
          </div>
          <dl class="product-page__details">
            <div v-if="products_store.product.sku"><dt>Артикул</dt><dd>{{ products_store.product.sku }}</dd></div>
            <div v-if="products_store.product.manufacturer_name"><dt>Изготовитель</dt><dd>{{ products_store.product.manufacturer_name }}</dd></div>
            <div v-if="products_store.product.manufacturer_address" class="product-page__detail--wide"><dt>Адрес изготовителя</dt><dd>{{ products_store.product.manufacturer_address }}</dd></div>
            <div v-if="products_store.product.tnved_code"><dt>ТН ВЭД ЕАЭС</dt><dd>{{ products_store.product.tnved_code }}</dd></div>
            <div v-if="products_store.product.okpd2_code"><dt>ОКПД2</dt><dd>{{ products_store.product.okpd2_code }}</dd></div>
          </dl>
        </section>

        <section v-if="has_documents" class="product-page__documents" aria-labelledby="product-documents-title">
          <div class="product-page__section-head">
            <span>Документы</span>
            <h2 id="product-documents-title">Регистрация и соответствие</h2>
          </div>
          <div class="product-page__documents-grid">
            <article v-if="products_store.product.conformity_number || products_store.product.conformity_url" class="product-page__document">
              <div><span>Документы о соответствии</span><strong v-if="products_store.product.conformity_number">{{ products_store.product.conformity_number }}</strong><p>Сведения указаны продавцом для этого товара.</p></div>
              <a v-if="products_store.product.conformity_url" :href="products_store.product.conformity_url" target="_blank" rel="noopener noreferrer">Открыть реестр ↗</a>
            </article>
            <article v-if="products_store.product.feed_additive_registration_number || products_store.product.feed_additive_registry_url" class="product-page__document">
              <div><span>Государственная регистрация кормовой добавки</span><strong v-if="products_store.product.feed_additive_registration_number">{{ products_store.product.feed_additive_registration_number }}</strong><p>Показывается только когда такая регистрация применима.</p></div>
              <a v-if="products_store.product.feed_additive_registry_url" :href="products_store.product.feed_additive_registry_url" target="_blank" rel="noopener noreferrer">Открыть реестр ↗</a>
            </article>
          </div>
        </section>
      </template>

      <div v-else class="product-page__empty">
        <h2>{{ error ? 'Не удалось загрузить товар' : 'Товар не найден' }}</h2>
        <p>{{ error ? 'Проверьте соединение и попробуйте обновить страницу.' : 'Попробуйте вернуться в каталог и выбрать другой товар.' }}</p>
        <NuxtLink to="/" class="btn btn--primary">Перейти в каталог</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {useProductsStore} from '~/stores/products'
import {useCartStore} from '~/stores/cart'
import {useNotificationsStore} from '~/stores/notifications'
import {getApiErrorMessage} from '~/utils/api'
import {useDelayedPending} from '~/composables/useDelayedPending'
import DiscountTiers from '~/components/catalog/DiscountTiers.vue'
import {createApiUrl} from '~/utils/api'

const route = useRoute()
const products_store = useProductsStore()
const cart_store = useCartStore()
const notifications = useNotificationsStore()
const {is_pending: is_adding, is_visible: show_adding, start: startAdding, finish: finishAdding} = useDelayedPending()
const image_is_loaded = ref(false)
const image_failed = ref(false)
const discount_rules = ref([])
const selected_media_index = ref(0)
const thumbs_track = ref(null)
let touch_start = null

const legacy_image = computed(() => {
  const product = products_store.product
  if (!product) return ''
  return product.image || product.image_url || product.preview_image || product.photo || ''
})
const media_items = computed(() => {
  const product = products_store.product
  if (!product) return []
  const items = Array.isArray(product.media) ? product.media.filter(item => item?.url) : []
  const result = [...items]
  if (legacy_image.value && !result.some(item => item.url === legacy_image.value)) {
    result.unshift({id: 'legacy-image', media_type: 'image', url: legacy_image.value})
  }
  return result
})
const selected_media = computed(() => media_items.value[selected_media_index.value] || media_items.value[0] || null)
const selected_media_key = computed(() => {
  const item = selected_media.value
  return item ? `${item.id || selected_media_index.value}-${item.url}` : 'no-media'
})
const product_image = computed(() => {
  if (selected_media.value?.media_type === 'image' && selected_media.value.url && !image_failed.value) return selected_media.value.url
  if (!selected_media.value && legacy_image.value && !image_failed.value) return legacy_image.value
  return ''
})
const seo_image = computed(() => media_items.value.find(item => item.media_type === 'image')?.url || legacy_image.value || '')
const has_multiple_media = computed(() => media_items.value.length > 1)
const show_thumb_controls = computed(() => media_items.value.length > 5)

const resetMediaLoadState = () => {
  image_is_loaded.value = false
  image_failed.value = false
}
const prefersReducedMotion = () => import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const scrollActiveThumb = async () => {
  await nextTick()
  const track = thumbs_track.value
  if (!track) return
  const thumb = track.querySelector(`[data-media-index="${selected_media_index.value}"]`)
  if (!thumb) return
  const left = thumb.offsetLeft - (track.clientWidth - thumb.clientWidth) / 2
  track.scrollTo({left: Math.max(0, left), behavior: prefersReducedMotion() ? 'auto' : 'smooth'})
}
const selectMedia = index => {
  const total = media_items.value.length
  if (!total) return
  const normalized = ((Number(index) % total) + total) % total
  if (normalized === selected_media_index.value) return
  selected_media_index.value = normalized
  resetMediaLoadState()
  scrollActiveThumb()
}
const previousMedia = () => selectMedia(selected_media_index.value - 1)
const nextMedia = () => selectMedia(selected_media_index.value + 1)
const scrollThumbs = direction => {
  const track = thumbs_track.value
  if (!track) return
  track.scrollBy({left: direction * Math.max(180, track.clientWidth * .72), behavior: prefersReducedMotion() ? 'auto' : 'smooth'})
}
const handleMediaTouchStart = event => {
  if (!has_multiple_media.value || event.target?.closest?.('video')) { touch_start = null; return }
  const touch = event.changedTouches?.[0]
  touch_start = touch ? {x: touch.clientX, y: touch.clientY} : null
}
const handleMediaTouchEnd = event => {
  if (!touch_start) return
  const touch = event.changedTouches?.[0]
  if (!touch) { touch_start = null; return }
  const dx = touch.clientX - touch_start.x
  const dy = touch.clientY - touch_start.y
  touch_start = null
  if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy) * 1.15) return
  if (dx < 0) nextMedia()
  else previousMedia()
}

watch(() => products_store.product?.id, () => {
  selected_media_index.value = 0
  resetMediaLoadState()
})
watch(() => media_items.value.length, length => {
  if (!length) selected_media_index.value = 0
  else if (selected_media_index.value >= length) selected_media_index.value = length - 1
})

const money = value => `${new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 2}).format(Number(value || 0))} ₽`
const formatted_price = computed(() => money(products_store.product?.effective_price ?? products_store.product?.price))
const formatted_regular_price = computed(() => money(products_store.product?.regular_price ?? products_store.product?.price))
const formatted_promotion_saving = computed(() => money(Math.max(0, Number(products_store.product?.regular_price ?? products_store.product?.price ?? 0) - Number(products_store.product?.effective_price ?? products_store.product?.price ?? 0))))
const promotion_period_text = computed(() => {
  const product = products_store.product
  if (!product?.promotion_active) return ''
  const start = product.sale_starts_at ? new Date(product.sale_starts_at).toLocaleDateString('ru-RU') : ''
  const end = product.sale_ends_at ? new Date(product.sale_ends_at).toLocaleDateString('ru-RU') : ''
  if (start && end) return `Акция действует с ${start} по ${end}.`
  if (end) return `Акция действует до ${end}.`
  if (start) return `Акция действует с ${start} до ручного отключения.`
  return 'Акция действует до ручного отключения.'
})
const has_purchase_facts = computed(() => { const p=products_store.product||{}; return Boolean(p.brand||p.package_weight_kg||p.country_of_origin||p.shelf_life_months) })
const has_usage_info = computed(() => { const p=products_store.product||{}; return Boolean(p.composition||p.feeding_guide||p.storage_conditions||p.usage_restrictions) })
const has_technical_details = computed(() => { const p=products_store.product||{}; return Boolean(p.sku||p.manufacturer_name||p.manufacturer_address||p.tnved_code||p.okpd2_code) })
const has_documents = computed(() => { const p=products_store.product||{}; return Boolean(p.conformity_number||p.conformity_url||p.feed_additive_registration_number||p.feed_additive_registry_url) })

const handleImageError = () => { image_failed.value = true; image_is_loaded.value = false }
const cart_item = computed(() => cart_store.items.find(item => Number(item.product_id || item.product?.id) === Number(route.params.id)) || null)
const cart_quantity = computed(() => Number(cart_item.value?.quantity || 0))
const is_in_cart = computed(() => cart_quantity.value > 0)
const can_increase = computed(() => cart_quantity.value < Number(products_store.product?.stock || 0))

const runCartUpdate = async (action, fallback_message) => {
  if (is_adding.value) return
  startAdding()
  try { await action() } catch (request_error) { notifications.error(getApiErrorMessage(request_error) || fallback_message) } finally { await finishAdding() }
}
const addToCart = async () => { if (Number(products_store.product?.stock || 0) <= 0) return; await runCartUpdate(() => cart_store.addItem(Number(route.params.id), 1), 'Не удалось добавить товар') }
const increaseQuantity = async () => { if (!can_increase.value) return; await runCartUpdate(() => cart_store.updateItem(Number(route.params.id), cart_quantity.value + 1), 'Не удалось изменить количество') }
const decreaseQuantity = async () => { if (!is_in_cart.value) return; await runCartUpdate(() => cart_quantity.value <= 1 ? cart_store.removeItem(Number(route.params.id)) : cart_store.updateItem(Number(route.params.id), cart_quantity.value - 1), 'Не удалось изменить количество') }

onMounted(async () => {
  await Promise.allSettled([
    cart_store.ensureCartLoaded(),
    $fetch(createApiUrl('/discount-rules')).then(rules => { discount_rules.value = rules })
  ])
})

const {status, error} = await useAsyncData(`product-${route.params.id}`, () => products_store.fetchProduct(route.params.id))

const site = useRuntimeConfig().public
const seo_description = computed(() => {
  const product = products_store.product
  if (!product) return 'Корма и лизунцы для лошадей в TauHorse.'
  const source = String(product.description || `${product.name}. Цена и наличие в TauHorse.`).replace(/\s+/g, ' ').trim()
  return source.length > 160 ? `${source.slice(0, 157).trim()}…` : source
})
const {canonical: product_canonical, image: product_seo_image} = useSiteSeo({
  title: computed(() => products_store.product ? `${products_store.product.name} — TauHorse` : 'Товар — TauHorse'),
  description: seo_description,
  image: seo_image,
  type: 'product'
})

useHead(() => {
  const product = products_store.product
  if (!product) return {}
  const price = Number(product.effective_price ?? product.price ?? 0)
  const stock = Number(product.stock || 0)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: seo_description.value,
    image: media_items.value.filter(item => item.media_type === 'image').map(item => {
      try { return new URL(item.url, `${String(site.appUrl || 'https://tauhorse.ru').replace(/\/$/, '')}/`).toString() } catch { return item.url }
    }),
    ...(product.sku ? {sku: product.sku} : {}),
    ...(product.brand ? {brand: {'@type': 'Brand', name: product.brand}} : {}),
    offers: {
      '@type': 'Offer',
      url: product_canonical.value,
      priceCurrency: 'RUB',
      price: price.toFixed(2),
      availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {'@type': 'Organization', name: 'TauHorse'}
    }
  }
  if (!jsonLd.image.length && product_seo_image.value) jsonLd.image = [product_seo_image.value]
  return {script:[{type:'application/ld+json', textContent: JSON.stringify(jsonLd)}]}
})
</script>

<style scoped lang="scss">
.product-page{padding:30px 0 58px;background:radial-gradient(circle at top left,rgba(170,130,82,.1),transparent 24%),linear-gradient(180deg,#f8f4ec 0%,#fcfbf8 38%,#f6f1e8 100%)}
.product-page__top{display:grid;grid-template-columns:minmax(360px,.9fr) minmax(440px,1.1fr);gap:22px;align-items:start}.product-page__media-column{display:grid;gap:10px;min-width:0}.product-page__media{position:relative;display:grid;place-items:center;aspect-ratio:1/1;min-height:420px;max-height:620px;overflow:hidden;border:1px solid rgba(122,92,55,.11);border-radius:27px;background:radial-gradient(circle at top right,rgba(175,145,101,.18),transparent 28%),linear-gradient(180deg,#f4ede2,#ebe1d2);box-shadow:0 18px 42px rgba(52,35,17,.06);outline:none;touch-action:pan-y pinch-zoom}.product-page__media:focus-visible{box-shadow:0 0 0 4px rgba(118,85,54,.12),0 18px 42px rgba(52,35,17,.06)}.product-page__image{display:block;width:100%;height:100%;max-height:620px;object-fit:contain;object-position:center;opacity:0;transition:opacity .22s ease}.product-page__image.is-loaded{opacity:1}.product-page__video{object-fit:contain;background:#241b13}.product-page__image-loader{position:absolute;inset:0}.product-page__image--placeholder{display:grid;place-items:center;padding:32px;color:#75644f;font-weight:650;text-align:center;opacity:1}.product-page__badges{position:absolute;z-index:3;top:14px;left:14px;right:14px;display:flex;flex-wrap:wrap;gap:6px;pointer-events:none}.product-page__badge{display:inline-flex;align-items:center;min-height:30px;padding:0 11px;border:1px solid rgba(122,92,55,.12);border-radius:999px;background:rgba(255,252,246,.92);backdrop-filter:blur(7px);color:#6f5230;font-size:10px;font-weight:850}.product-page__badge--sale{border-color:transparent;background:rgba(125,46,46,.94);color:#fff}.product-page__badge--featured{background:rgba(239,224,185,.95);color:#4b3823}
.product-page__media-nav{position:absolute;z-index:4;top:50%;display:grid;place-items:center;width:42px;height:42px;padding:0;border:1px solid rgba(111,82,48,.14);border-radius:50%;background:rgba(255,253,249,.9);color:#5c432a;box-shadow:0 8px 20px rgba(44,29,15,.13);backdrop-filter:blur(8px);cursor:pointer;transform:translateY(-50%);transition:background-color .16s ease,border-color .16s ease,box-shadow .16s ease}.product-page__media-nav:hover{border-color:rgba(111,82,48,.28);background:#fff;box-shadow:0 10px 24px rgba(44,29,15,.18)}.product-page__media-nav:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(118,85,54,.13),0 10px 24px rgba(44,29,15,.16)}.product-page__media-nav svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.product-page__media-nav--prev{left:14px}.product-page__media-nav--next{right:14px}.product-page__media-counter{position:absolute;z-index:4;right:14px;bottom:14px;min-width:50px;padding:6px 9px;border-radius:999px;background:rgba(42,31,20,.7);color:#fff;font-size:10px;font-weight:800;text-align:center;backdrop-filter:blur(7px)}
.product-page__thumbs-shell{min-width:0}.product-page__thumbs-shell.has-controls{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;align-items:center;gap:6px}.product-page__thumbs{display:flex;gap:8px;min-width:0;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x proximity;padding:1px;scrollbar-width:none;-ms-overflow-style:none}.product-page__thumbs::-webkit-scrollbar{display:none;width:0;height:0}.product-page__thumb{position:relative;display:grid;place-items:center;flex:0 0 72px;width:72px;height:64px;overflow:hidden;padding:0;border:2px solid transparent;border-radius:12px;background:#eee5d8;cursor:pointer;scroll-snap-align:center;transition:border-color .16s ease,box-shadow .16s ease}.product-page__thumb:hover{border-color:rgba(120,88,56,.3)}.product-page__thumb.is-active{border-color:#785838;box-shadow:0 0 0 2px rgba(120,88,56,.09)}.product-page__thumb img,.product-page__thumb video{width:100%;height:100%;object-fit:cover}.product-page__thumb>span{position:absolute;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:rgba(35,25,16,.7);color:#fff;font-size:10px}.product-page__thumbs-nav{display:grid;place-items:center;width:34px;height:38px;padding:0;border:1px solid rgba(111,82,48,.12);border-radius:11px;background:#fffdf9;color:#60472f;cursor:pointer}.product-page__thumbs-nav:hover{background:#f3ece3}.product-page__thumbs-nav svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.product-page__summary{display:grid;gap:18px;padding:28px;border:1px solid rgba(122,92,55,.11);border-radius:27px;background:rgba(255,252,247,.9);box-shadow:0 18px 42px rgba(52,35,17,.055)}.product-page__head{display:grid;gap:10px}.product-page__category{margin:0;color:#8a6a42;font-size:10px;font-weight:850;letter-spacing:.09em;text-transform:uppercase}.product-page__title{margin:0;color:#2f2418;font-size:clamp(30px,3.6vw,44px);line-height:1.02;letter-spacing:-.04em}.product-page__description{margin:0;color:#61584d;font-size:14px;line-height:1.65}.product-page__facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0}.product-page__facts>div{display:grid;gap:3px;padding:11px 12px;border:1px solid rgba(111,82,48,.08);border-radius:13px;background:#faf6f0}.product-page__facts dt{color:#8e8174;font-size:9px;font-weight:800;letter-spacing:.055em;text-transform:uppercase}.product-page__facts dd{min-width:0;margin:0;color:#3d2d1e;font-size:12px;font-weight:750;overflow-wrap:anywhere}
.product-page__buybox{display:grid;gap:14px;padding:18px;border:1px solid rgba(111,82,48,.11);border-radius:20px;background:#fff}.product-page__buybox-top{display:grid;grid-template-columns:1fr auto;align-items:center;gap:16px}.product-page__price-block{display:grid;justify-items:start;gap:4px}.product-page__meta-label{color:#85796d;font-size:9px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.product-page__old-price{color:#9a8b7b;font-size:12px;text-decoration:line-through}.product-page__price{color:#2f2418;font-size:34px;font-weight:850;line-height:1;letter-spacing:-.04em}.product-page__saving{color:#397049;font-size:10px;font-weight:800}.product-page__availability{display:grid;grid-template-columns:8px 1fr;align-items:center;gap:8px;min-width:130px;padding:10px 11px;border-radius:13px;background:#f4f7f2}.product-page__availability>i{width:8px;height:8px;border-radius:50%;background:currentColor}.product-page__availability>div{display:grid;gap:2px}.product-page__availability span{color:#8a8177;font-size:8px;font-weight:800;text-transform:uppercase}.product-page__availability strong{font-size:11px}.is-in-stock{color:#2f7a52}.is-out-stock{color:#b05548}.product-page__promo-info{display:grid;gap:3px;padding:11px 12px;border:1px solid rgba(125,46,46,.1);border-radius:13px;background:#fff5f2}.product-page__promo-info strong{color:#7d2e2e;font-size:12px}.product-page__promo-info span{color:#806b63;font-size:10px;line-height:1.4}.product-page__actions{display:flex;flex-wrap:wrap;gap:9px}.product-page__button{min-width:190px}.product-page__cart-control{display:flex;align-items:center;gap:8px;min-height:48px;padding-left:12px;border:1px solid rgba(111,82,48,.13);border-radius:13px;background:#faf7f2}.product-page__cart-label{color:#6f6255;font-size:11px;font-weight:750;white-space:nowrap}.product-page__quantity{display:grid;grid-template-columns:40px 46px 40px;overflow:hidden;min-height:46px;margin-left:auto;border-left:1px solid rgba(111,82,48,.1);background:#fff}.product-page__quantity button,.product-page__quantity strong{display:grid;place-items:center;width:100%;border:0;background:transparent;color:#44321f}.product-page__quantity button{font-size:19px;cursor:pointer}.product-page__quantity button:hover:not(:disabled){background:#eee3d5}.product-page__quantity button:disabled{opacity:.35;cursor:not-allowed}.product-page__quantity strong{border-right:1px solid rgba(111,82,48,.1);border-left:1px solid rgba(111,82,48,.1);font-size:13px}.product-page__delivery-note{margin:0;color:#8a7d70;font-size:9px;line-height:1.45}
.product-page__content,.product-page__technical,.product-page__documents{margin-top:18px;padding:24px;border:1px solid rgba(111,82,48,.1);border-radius:24px;background:rgba(255,255,255,.72)}.product-page__section-head{margin-bottom:15px}.product-page__section-head>span{color:#92714c;font-size:9px;font-weight:850;letter-spacing:.085em;text-transform:uppercase}.product-page__section-head h2{margin:4px 0 0;color:#382a1b;font-size:24px;line-height:1.15}.product-page__info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.product-page__info-card{display:grid;grid-template-columns:32px 1fr;gap:11px;padding:15px;border-radius:16px;background:#f4eee5}.product-page__info-card--wide{grid-column:1/-1}.product-page__info-icon{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#fff;color:#785835;font-weight:850;box-shadow:0 5px 12px rgba(60,40,20,.05)}.product-page__info-card h3{margin:1px 0 6px;color:#392a1b;font-size:14px}.product-page__info-card p{margin:0;color:#655c51;font-size:12px;line-height:1.62;white-space:pre-line}
.product-page__details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:0;overflow:hidden;border:1px solid rgba(122,92,55,.1);border-radius:16px;background:rgba(122,92,55,.1)}.product-page__details>div{display:grid;gap:5px;min-width:0;padding:13px 14px;background:rgba(255,255,255,.88)}.product-page__detail--wide{grid-column:span 2}.product-page__details dt{color:#887b6b;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.product-page__details dd{min-width:0;margin:0;color:#342719;font-size:12px;font-weight:700;line-height:1.4;overflow-wrap:anywhere}.product-page__documents-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.product-page__document{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:15px;border:1px solid rgba(72,99,61,.15);border-radius:16px;background:#f6f9f3}.product-page__document>div{display:grid;gap:4px;min-width:0}.product-page__document span{color:#74806e;font-size:9px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.product-page__document strong{color:#35472e;font-size:12px;overflow-wrap:anywhere}.product-page__document p{margin:0;color:#707969;font-size:10px;line-height:1.45}.product-page__document a{flex:0 0 auto;color:#4d643f;font-size:10px;font-weight:850;text-decoration:none}.product-page__document a:hover{text-decoration:underline}
.product-page__skeleton{display:grid;grid-template-columns:1fr 1fr;gap:20px;min-height:520px}.product-page__skeleton-media{border-radius:27px}.product-page__skeleton-copy{display:grid;align-content:start;gap:16px;padding:30px;border-radius:27px;background:#fff}.product-page__skeleton-line{height:18px;border-radius:9px}.product-page__skeleton-line--small{width:28%;height:12px}.product-page__skeleton-line--title{width:82%;height:48px}.product-page__skeleton-box{height:180px;margin-top:8px;border-radius:20px}.product-page__empty{display:grid;justify-items:center;gap:10px;padding:54px 24px;border:1px dashed rgba(122,92,55,.24);border-radius:28px;background:rgba(255,255,255,.72);text-align:center}.product-page__empty h2,.product-page__empty p{margin:0}.product-page__empty p{color:#6d675f}
:deep(.btn){display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:13px;text-decoration:none;font-weight:700;transition:box-shadow .2s ease,background-color .2s ease,border-color .2s ease,color .2s ease,filter .2s ease}:deep(.btn--primary){border:1px solid #7a5833;background:linear-gradient(180deg,#8f6840,#714f2e);color:#fff;box-shadow:0 12px 24px rgba(111,82,48,.18)}:deep(.btn--secondary){border:1px solid rgba(111,82,48,.16);background:#fff;color:#4a3723}:deep(.btn:disabled){opacity:.55;cursor:not-allowed}
@media(max-width:1120px){.product-page__top,.product-page__skeleton{grid-template-columns:1fr}.product-page__media-column{width:min(100%,680px);margin-inline:auto}.product-page__media{aspect-ratio:4/3;min-height:0;max-height:560px}.product-page__summary{padding:22px}.product-page__title{font-size:34px}.product-page__details{grid-template-columns:repeat(2,minmax(0,1fr))}.product-page__skeleton-media{min-height:420px}}
@media(max-width:820px){.product-page__media-column{width:100%}.product-page__media{max-height:520px}.product-page__summary{padding:20px}.product-page__info-grid,.product-page__documents-grid{grid-template-columns:1fr}.product-page__info-card--wide{grid-column:auto}.product-page__document{flex-direction:column}.product-page__details{grid-template-columns:repeat(2,minmax(0,1fr))}.product-page__detail--wide{grid-column:1/-1}.product-page__skeleton-media{min-height:360px}}
@media(max-width:760px){.product-page__media-nav{display:none}.product-page__thumbs-shell.has-controls{display:block}.product-page__thumbs-nav{display:none}.product-page__thumbs{padding-bottom:2px}.product-page__thumb{flex-basis:68px;width:68px;height:60px}.product-page__media-counter{right:10px;bottom:10px}.product-page__media.has-navigation::after{content:'Свайп';position:absolute;z-index:3;bottom:12px;left:12px;padding:5px 8px;border-radius:999px;background:rgba(255,253,249,.82);color:#745a3d;font-size:8px;font-weight:850;letter-spacing:.05em;text-transform:uppercase;pointer-events:none}}
@media(max-width:560px){.product-page{padding:18px 0 40px}.product-page__media{aspect-ratio:4/3;max-height:420px;border-radius:21px}.product-page__summary{gap:15px;padding:17px;border-radius:21px}.product-page__title{font-size:30px}.product-page__description{font-size:13px}.product-page__facts{grid-template-columns:1fr 1fr}.product-page__buybox{padding:14px}.product-page__buybox-top{grid-template-columns:1fr}.product-page__availability{min-width:0}.product-page__actions{display:grid;grid-template-columns:1fr}.product-page__button{width:100%;min-width:0}.product-page__cart-control{width:100%}.product-page__quantity{grid-template-columns:44px 1fr 44px;flex:1}.product-page__content,.product-page__technical,.product-page__documents{padding:17px;border-radius:20px}.product-page__section-head h2{font-size:21px}.product-page__details{grid-template-columns:1fr}.product-page__detail--wide{grid-column:auto}.product-page__skeleton-media{min-height:280px}.product-page__skeleton-copy{padding:20px}.product-page__thumb{flex-basis:62px;width:62px;height:56px}}
@media(prefers-reduced-motion:reduce){.product-page__image,.product-page__media-nav,.product-page__thumb{transition:none}}
</style>
