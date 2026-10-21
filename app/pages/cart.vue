<template>
  <section class="cart-page">
    <div class="container">
      <div class="cart-page__head">
        <div>
          <span class="cart-page__eyebrow">Ваш заказ</span>
          <h1 class="cart-page__title">Корзина</h1>
          <p class="cart-page__text">
            Проверьте выбранные товары перед оформлением заказа
          </p>
        </div>

        <NuxtLink to="/" class="btn btn--ghost cart-page__back">
          Продолжить покупки
        </NuxtLink>
      </div>

      <div class="cart-layout">
        <div class="cart-layout__main">
          <div v-if="!cart_store.is_loaded || cart_store.is_loading" class="cart-loading">
            <div class="cart-loading__card"></div>
            <div class="cart-loading__card"></div>
            <div class="cart-loading__card"></div>
          </div>

          <div v-else-if="cart_store.items.length" class="cart-list-wrap">
            <div class="cart-list-head">
              <div>
                <h2 class="cart-list-head__title">Товары в корзине</h2>
                <p class="cart-list-head__text">
                  {{ cart_store.items_count }} {{ getProductWord(cart_store.items_count) }}
                </p>
              </div>
            </div>

            <div class="cart-grid">
              <CartItemCard
                  v-for="item in cart_store.items"
                  :key="item.id"
                  :item="item"
              />
            </div>
          </div>

          <div v-else class="cart-empty">
            <div class="cart-empty__icon"></div>
            <h2 class="cart-empty__title">Корзина пока пуста</h2>
            <p class="cart-empty__text">
              Добавьте корма и лизунцы для лошадей, чтобы оформить заказ
            </p>
            <NuxtLink to="/" class="btn btn--primary">
              Перейти в каталог
            </NuxtLink>
          </div>
        </div>

        <aside class="cart-summary">
          <div v-if="!cart_store.is_loaded || cart_store.is_loading" class="cart-summary__box">
            <span class="cart-summary__eyebrow">Сводка заказа</span>
            <h2 class="cart-summary__title">Итого</h2>

            <div class="cart-summary__rows">
              <div class="cart-summary__row">
                <span>Товаров</span>
                <strong>—</strong>
              </div>

              <div class="cart-summary__row">
                <span>Сумма</span>
                <strong>—</strong>
              </div>
            </div>
          </div>

          <div v-else class="cart-summary__box">
            <span class="cart-summary__eyebrow">Сводка заказа</span>
            <h2 class="cart-summary__title">Итого</h2>

            <div class="cart-summary__rows">
              <div class="cart-summary__row">
                <span>Товаров</span>
                <strong>{{ cart_store.items_count }}</strong>
              </div>

              <div class="cart-summary__row">
                <span>По обычным ценам</span>
                <strong>{{ formatMoney(cart_store.regular_subtotal) }} ₽</strong>
              </div>

              <div v-if="cart_store.promotion_discount_amount > 0" class="cart-summary__row cart-summary__row--saving">
                <span>Акции на товары</span>
                <strong>−{{ formatMoney(cart_store.promotion_discount_amount) }} ₽</strong>
              </div>

              <div v-if="cart_store.promotion_discount_amount > 0 && cart_store.discount_amount > 0" class="cart-summary__row cart-summary__row--intermediate">
                <span>После акций на товары</span>
                <strong>{{ formatMoney(cart_store.subtotal) }} ₽</strong>
              </div>

              <div v-if="cart_store.discount_amount > 0" class="cart-summary__row cart-summary__row--saving">
                <span>Скидка от суммы заказа {{ cart_store.discount_percent }}%</span>
                <strong>−{{ formatMoney(cart_store.discount_amount) }} ₽</strong>
              </div>
            </div>

            <p v-if="cart_store.promotion_discount_amount > 0 || cart_store.discount_amount > 0" class="cart-summary__pricing-note">
              Сначала применяются акции отдельных товаров, затем скидка от суммы заказа — к стоимости товаров после акций. Доставка в порог скидки не входит.
            </p>

            <DiscountTiers :rules="discount_rules" :subtotal="cart_store.subtotal" compact />
            <div class="cart-summary__total">
              <span>Сумма товаров</span>
              <strong>{{ formatMoney(cart_store.total_price) }} ₽</strong>
            </div>

            <div v-if="cart_store.items.length" class="cart-share">
              <button class="btn btn--secondary cart-summary__button" type="button" :class="{'is-loading': share_loading}" :disabled="share_loading" @click="createShareLink">
                {{ share_url ? 'Обновить ссылку на корзину' : 'Поделиться корзиной' }}
              </button>

              <div v-if="share_url" class="cart-share__panel">
                <div class="cart-share__copy-row">
                  <input class="cart-share__input" :value="share_url" readonly aria-label="Ссылка на общую корзину" @focus="$event.target.select()">
                  <button class="cart-share__copy" type="button" @click="copyShareLink" :aria-label="copy_label">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>
                    <span>{{ copy_label }}</span>
                  </button>
                </div>
                <button v-if="can_native_share" class="cart-share__native" type="button" @click="nativeShare">Поделиться через приложение…</button>
                <p>Ссылка передаёт только состав корзины, без аккаунта и личных данных. Она действует 30 дней.</p>
              </div>
            </div>

            <NuxtLink
                to="/checkout"
                class="btn btn--primary cart-summary__button"
                :class="{ 'is-disabled': !cart_store.items.length }"
            >
              Оформить заказ
            </NuxtLink>

            <NuxtLink to="/" class="btn btn--secondary cart-summary__button">
              Вернуться в каталог
            </NuxtLink>

            <p class="cart-summary__note">
              Доставка в эту сумму не включена. На оформлении выберите удобный способ — тариф согласуем до оплаты.
            </p>
          </div>
        </aside>
      </div>
    </div>
  </section>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {createApiUrl} from '~/utils/api'
import CartItemCard from '~/components/cart/CartItemCard/CartItemCard.vue'
import DiscountTiers from '~/components/catalog/DiscountTiers.vue'
import {useCartStore} from '~/stores/cart'

const cart_store = useCartStore()
const discount_rules = ref([])
const share_url = ref('')
const share_loading = ref(false)
const copied = ref(false)
const can_native_share = computed(() => import.meta.client && typeof navigator?.share === 'function')
const copy_label = computed(() => copied.value ? 'Скопировано' : 'Копировать')
const formatMoney = value => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 2}).format(Number(value || 0))

const createShareLink = async () => {
  share_loading.value = true
  copied.value = false
  try {
    const result = await cart_store.apiFetch('/cart/share', {method: 'POST'})
    share_url.value = `${window.location.origin}/shared-cart/${result.token}`
  } catch (error) {
    console.error(error)
    share_url.value = ''
  } finally {
    share_loading.value = false
  }
}

const copyShareLink = async () => {
  if (!share_url.value || !import.meta.client) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(share_url.value)
    } else {
      const input = document.querySelector('.cart-share__input')
      input?.focus()
      input?.select()
      document.execCommand('copy')
    }
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 1800)
  } catch (error) {
    console.error(error)
  }
}

const nativeShare = async () => {
  if (!share_url.value || !can_native_share.value) return
  try {
    await navigator.share({title: 'Моя корзина — TauHorse', text: 'Посмотрите, что я выбрал для лошади', url: share_url.value})
  } catch (error) {
    if (error?.name !== 'AbortError') console.error(error)
  }
}

const getProductWord = count => {
  const last_two_digits = count % 100
  const last_digit = count % 10
  if (last_two_digits >= 11 && last_two_digits <= 14) return 'товаров'
  if (last_digit === 1) return 'товар'
  if (last_digit >= 2 && last_digit <= 4) return 'товара'
  return 'товаров'
}

const refreshCartPricing = async () => {
  try {
    const [rules] = await Promise.all([$fetch(createApiUrl('/discount-rules')), cart_store.fetchCart()])
    discount_rules.value = rules
  } catch (error) {
    console.error(error)
  }
}

onMounted(async () => {
  // Always refresh on entering/focusing the cart. This prevents stale prices/discounts
  // after an administrator changes a promotion or volume rule.
  await refreshCartPricing()
  window.addEventListener('focus', refreshCartPricing)
})

onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('focus', refreshCartPricing)
})
</script>

<style scoped lang="scss">
.cart-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 1100px) {
  .cart-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .cart-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
}

@media (max-width: 420px) {
  .cart-grid {
    grid-template-columns: 1fr;
  }
}

.cart-loading {
  display: grid;
  gap: 16px;
}

.cart-loading__card {
  height: 140px;
  border-radius: 24px;
  background: linear-gradient(
          90deg,
          rgba(241, 232, 219, 0.7) 0%,
          rgba(255, 249, 241, 0.95) 50%,
          rgba(241, 232, 219, 0.7) 100%
  );
  background-size: 200% 100%;
  animation: cart-loading-shimmer 1.2s linear infinite;
  border: 1px solid rgba(122, 92, 55, 0.08);
}

@keyframes cart-loading-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

.cart-page {
  padding: 32px 0 56px;
  background: radial-gradient(circle at top left, rgba(170, 130, 82, 0.1), transparent 24%),
  linear-gradient(180deg, #f8f4ec 0%, #fcfbf8 38%, #f6f1e8 100%);
}

.cart-page__head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}

.cart-page__eyebrow {
  display: inline-block;
  margin-bottom: 10px;
  color: #8a6a42;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.cart-page__title {
  margin: 0;
  color: #2f2418;
  font-size: 40px;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.cart-page__text {
  margin: 10px 0 0;
  color: #6d675f;
  font-size: 16px;
  line-height: 1.65;
}

.cart-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
  align-items: start;
}

.cart-layout__main {
  min-width: 0;
}

.cart-list-wrap {
  padding: 22px;
  border: 1px solid rgba(122, 92, 55, 0.12);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 252, 247, 0.98) 0%, rgba(248, 244, 237, 0.98) 100%);
  box-shadow: 0 18px 36px rgba(44, 31, 18, 0.06),
  inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.cart-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(122, 92, 55, 0.1);
}

.cart-list-head__title {
  margin: 0;
  color: #2f2418;
  font-size: 24px;
  line-height: 1.15;
}

.cart-list-head__text {
  margin: 8px 0 0;
  color: #7b7368;
  font-size: 14px;
}

.cart-list {
  display: grid;
  gap: 16px;
}

.cart-empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 42px 24px;
  border: 1px dashed rgba(122, 92, 55, 0.2);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.72);
  text-align: center;
}

.cart-empty__icon {
  width: 62px;
  height: 62px;
  border-radius: 20px;
  background: linear-gradient(180deg, #f1e4cf 0%, #e5d1b2 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.cart-empty__title {
  margin: 0;
  color: #2f2418;
  font-size: 28px;
  line-height: 1.1;
}

.cart-empty__text {
  max-width: 420px;
  margin: 0;
  color: #6d675f;
  line-height: 1.65;
}

.cart-summary {
  position: sticky;
  top: 96px;
}

.cart-summary__box {
  padding: 24px;
  border: 1px solid rgba(122, 92, 55, 0.12);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 250, 243, 0.98) 0%, rgba(245, 237, 223, 0.98) 100%);
  box-shadow: 0 18px 36px rgba(44, 31, 18, 0.06),
  inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.cart-summary__eyebrow {
  display: inline-block;
  margin-bottom: 10px;
  color: #8a6a42;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.cart-summary__title {
  margin: 0;
  color: #2f2418;
  font-size: 28px;
  line-height: 1.1;
}

.cart-summary__rows {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.cart-summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #5f584f;
  font-size: 15px;
}

.cart-summary__row strong {
  color: #2f2418;
  font-weight: 700;
}

.cart-summary__total {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(122, 92, 55, 0.12);
}

.cart-summary__total span {
  color: #4f463b;
  font-size: 15px;
  font-weight: 600;
}

.cart-summary__total strong {
  color: #2f2418;
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
}

.cart-summary__button {
  width: 100%;
  margin-top: 14px;
}

.cart-summary__row--intermediate { color:#75695c; }
.cart-summary__row--intermediate strong { color:#4b3a29; }
.cart-summary__row--saving { color: #4f7557; }
.cart-summary__row--saving strong { color: #397049; }
.cart-summary__pricing-note { margin: 14px 0 0; padding: 11px 12px; border-radius: 12px; background: rgba(255,255,255,.58); color:#766a5d; font-size:11px; line-height:1.5; }
.cart-share { display:grid; gap:10px; margin-top:14px; }
.cart-share .cart-summary__button { margin-top:0; }
.cart-share__panel { display:grid; gap:9px; padding:12px; border:1px solid rgba(111,82,48,.12); border-radius:14px; background:rgba(255,255,255,.72); }
.cart-share__copy-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; }
.cart-share__input { min-width:0; height:40px; padding:0 11px; border:1px solid rgba(111,82,48,.16); border-radius:10px; background:#fff; color:#5f5245; font-size:11px; }
.cart-share__copy,.cart-share__native { min-height:40px; border:1px solid rgba(111,82,48,.14); border-radius:10px; background:#f4ede3; color:#4f3b26; font-size:11px; font-weight:750; cursor:pointer; transition:background-color .2s ease,border-color .2s ease,box-shadow .2s ease; }
.cart-share__copy { display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 11px;white-space:nowrap; }
.cart-share__copy svg { width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round; }
.cart-share__copy:hover,.cart-share__native:hover { background:#eee3d5; border-color:rgba(111,82,48,.23); box-shadow:0 5px 12px rgba(67,46,22,.07); }
.cart-share__native { width:100%; padding:0 12px; }
.cart-share__panel p { margin:0; color:#827568; font-size:11px; line-height:1.45; }

.cart-summary__note {
  margin: 14px 0 0;
  color: #7c7469;
  font-size: 13px;
  line-height: 1.55;
}

.is-disabled {
  pointer-events: none;
  opacity: 0.55;
}

:deep(.btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 14px;
  text-decoration: none;
  font-weight: 600;
  transition: box-shadow 0.2s ease,
  background-color 0.2s ease,
  border-color 0.2s ease,
  color 0.2s ease,
  filter 0.2s ease;
}

:deep(.btn--primary) {
  border: 1px solid #7a5833;
  background: linear-gradient(180deg, #8f6840 0%, #714f2e 100%);
  color: #fff;
  box-shadow: 0 12px 24px rgba(111, 82, 48, 0.18);
}

:deep(.btn--secondary) {
  border: 1px solid rgba(111, 82, 48, 0.16);
  background: #fff;
  color: #4a3723;
}

:deep(.btn--ghost) {
  border: 1px solid rgba(111, 82, 48, 0.14);
  background: rgba(255, 255, 255, 0.55);
  color: #4a3723;
}

@media (max-width: 1100px) {
  .cart-layout {
    grid-template-columns: 1fr;
  }

  .cart-summary {
    position: static;
  }
}

@media (max-width: 760px) {
  .cart-page {
    padding: 22px 0 40px;
  }

  .cart-page__head {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 22px;
  }

  .cart-page__title {
    font-size: 32px;
  }

  .cart-list-wrap,
  .cart-summary__box,
  .cart-empty {
    padding: 18px;
    border-radius: 22px;
  }

  .cart-list-head__title {
    font-size: 22px;
  }

  .cart-summary__title {
    font-size: 24px;
  }

  .cart-summary__total strong {
    font-size: 28px;
  }

  .cart-page__back {
    width: 100%;
  }
}
</style>