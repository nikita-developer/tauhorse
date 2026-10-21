<template>
  <section class="order-view">
    <div class="container">
      <div v-if="is_loading" class="order-view__loading card">
        Загружаем заказ…
      </div>

      <div v-else-if="error_message" class="order-view__error card">
        <h1>Не удалось открыть заказ</h1>
        <p>{{ error_message }}</p>
        <NuxtLink to="/orders" class="btn btn--primary">К списку заказов</NuxtLink>
      </div>

      <template v-else-if="order">
        <div class="order-view__topbar">
          <NuxtLink to="/orders" class="order-view__back">← Все заказы</NuxtLink>
          <NuxtLink to="/" class="order-view__catalog">Продолжить покупки</NuxtLink>
        </div>

        <header class="order-hero">
          <div>
            <span class="order-hero__eyebrow">Заказ получен</span>
            <h1>Заказ №{{ order.id }}</h1>
            <p>{{ formattedDate }}</p>
          </div>

          <div class="order-status" :class="`order-status--${order.status}`">
            <span class="order-status__dot"></span>
            <div>
              <small>Текущий статус</small>
              <strong>{{ getOrderStatusLabel(order.status) }}</strong>
              <span class="order-status__live"><i v-if="!isTerminal" :class="{'is-refreshing':is_refreshing}" aria-hidden="true"></i>{{ orderLiveText }}</span>
            </div>
          </div>
        </header>

        <div class="order-layout">
          <main class="order-layout__main">
            <section class="order-card card">
              <div class="order-card__head">
                <div>
                  <span>Состав заказа</span>
                  <h2>{{ itemCount }} {{ productWord(itemCount) }}</h2>
                </div>
                <strong>{{ money(order.subtotal || itemsSubtotal) }}</strong>
              </div>

              <div class="order-items">
                <article v-for="item in order.items" :key="item.id" class="order-item">
                  <div class="order-item__media">
                    <img v-if="getProductImage(item.product)" :src="getProductImage(item.product)" :alt="item.product?.name || 'Товар'">
                    <span v-else>{{ item.product?.category?.name || 'TauHorse' }}</span>
                  </div>

                  <div class="order-item__content">
                    <p>{{ item.product?.category?.name || 'Товар' }}</p>
                    <h3>{{ item.product?.name || `Товар #${item.product_id}` }}</h3>
                    <span>{{ money(item.price) }} × {{ item.quantity }}</span>
                  </div>

                  <strong class="order-item__total">{{ money(Number(item.price) * Number(item.quantity)) }}</strong>
                </article>
              </div>
            </section>

            <section class="order-card card">
              <div class="order-card__head order-card__head--simple">
                <div>
                  <span>Получение</span>
                  <h2>{{ deliveryMethodLabel }}</h2>
                </div>
              </div>

              <dl class="order-details">
                <div>
                  <dt>Получатель</dt>
                  <dd>{{ order.name }}</dd>
                </div>
                <div>
                  <dt>Телефон</dt>
                  <dd><a :href="`tel:${order.phone}`">{{ order.phone }}</a></dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd><a :href="`mailto:${order.email}`">{{ order.email }}</a></dd>
                </div>
                <div v-if="needsDeliveryDetails(order.delivery_method)">
                  <dt>Данные доставки</dt>
                  <dd>{{ order.address }}<template v-if="usesPostalCode(order.delivery_method) && order.postal_code">, {{ order.postal_code }}</template></dd>
                </div>
                <div v-if="order.comment" class="order-details__wide">
                  <dt>Комментарий</dt>
                  <dd>{{ order.comment }}</dd>
                </div>
              </dl>
            </section>
          </main>

          <aside class="order-summary card">
            <span class="order-summary__eyebrow">Итого</span>
            <h2>Сумма заказа</h2>

            <div class="order-summary__rows">
              <div>
                <span>Товары</span>
                <strong>{{ money(order.subtotal || itemsSubtotal) }}</strong>
              </div>
              <div v-if="Number(order.discount_amount || 0) > 0" class="order-summary__discount">
                <span>Скидка от суммы {{ Number(order.discount_percent || 0) }}%</span>
                <strong>−{{ money(order.discount_amount) }}</strong>
              </div>
              <div>
                <span>Доставка</span>
                <strong>{{ deliveryPriceLabel }}</strong>
              </div>
            </div>

            <div class="order-summary__total">
              <span>{{ orderTotalLabel }}</span>
              <strong>{{ money(order.total_price) }}</strong>
            </div>

            <p class="order-summary__note">
              <template v-if="order.delivery_method !== 'pickup' && order.delivery_price_confirmed !== true">Стоимость доставки пока не включена: мы согласуем её до оплаты. </template><template v-if="order.status === 'pending'">Заказ будет подтверждён после связи с вами. </template>Статус заказа обновляется на странице автоматически и может дополнительно отправляться на {{ order.email }}.
            </p>

            <button v-if="canCancel" class="btn btn--secondary order-summary__button order-summary__cancel" :disabled="is_cancelling" @click="cancelAndEdit">{{ is_cancelling ? 'Отменяем…' : 'Отменить и изменить заказ' }}</button><p v-if="canCancel" class="order-summary__cancel-note">Если забыли товар, мы отменим текущую заявку, вернём позиции в корзину и вы сможете оформить новую.</p><NuxtLink to="/" class="btn btn--primary order-summary__button">Вернуться в каталог</NuxtLink>
          </aside>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {useOrdersStore} from '~/stores/orders'
import {useAuthStore} from '~/stores/auth'
import {getOrderStatusLabel} from '~/utils/order-status'
import {getDeliveryMethodLabel, getDeliveryPriceLabel, needsDeliveryDetails, usesPostalCode} from '~/utils/delivery'
import {useCartStore} from '~/stores/cart'
import {useNotificationsStore} from '~/stores/notifications'

const route = useRoute()
const orders_store = useOrdersStore()
const auth_store = useAuthStore()
const cart_store=useCartStore()
const notifications=useNotificationsStore()
const is_cancelling=ref(false)
const is_loading = ref(true)
const error_message = ref('')
const is_refreshing = ref(false)

const order = computed(() => orders_store.order)
const itemCount = computed(() => (order.value?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0))
const itemsSubtotal = computed(() => (order.value?.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))

const formattedDate = computed(() => {
  if (!order.value?.created_at) return ''
  return new Intl.DateTimeFormat('ru-RU', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'}).format(new Date(order.value.created_at))
})

const canCancel=computed(()=>order.value?.can_cancel===true)
const isTerminal = computed(() => ['completed','cancelled'].includes(order.value?.status))
const orderLiveText = computed(() => {
  if (is_refreshing.value) return 'Проверяем обновление…'
  if (order.value?.status === 'completed') return 'Заказ завершён — автообновление остановлено'
  if (order.value?.status === 'cancelled') return 'Заказ отменён — автообновление остановлено'
  return 'Статус проверяется автоматически раз в 15 сек'
})

const deliveryMethodLabel = computed(() => getDeliveryMethodLabel(order.value?.delivery_method))
const deliveryPriceLabel = computed(() => getDeliveryPriceLabel(order.value))
const orderTotalLabel = computed(() => order.value?.delivery_method !== 'pickup' && order.value?.delivery_price_confirmed !== true ? 'Сумма товаров' : 'К оплате')

const money = value => `${new Intl.NumberFormat('ru-RU').format(Number(value || 0))} ₽`

const productWord = count => {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return 'товаров'
  if (mod10 === 1) return 'товар'
  if (mod10 >= 2 && mod10 <= 4) return 'товара'
  return 'товаров'
}

const getProductImage = product => product?.image || product?.image_url || product?.preview_image || product?.photo || ''

const getOrderToken = () => {
  if (import.meta.client && route.hash) return new URLSearchParams(route.hash.replace(/^#/, '')).get('token') || ''
  return ''
}


const cancelAndEdit=async()=>{
  if(is_cancelling.value||!order.value)return
  if(!confirm('Отменить этот заказ и вернуть его товары в корзину? После этого можно добавить забытые позиции и оформить новый заказ.'))return
  is_cancelling.value=true
  try{
    await orders_store.cancelCustomerOrder(order.value.id,{token:getOrderToken(),restore_to_cart:true})
    cart_store.is_loaded=false
    await cart_store.fetchCart()
    notifications.info('Заказ отменён, товары возвращены в корзину')
    await navigateTo('/cart')
  }catch(error){notifications.error(error?.data?.message||error?.response?._data?.message||'Не удалось отменить заказ')}finally{is_cancelling.value=false}
}

let statusRefreshTimer = null
const refreshOrderStatus = async () => {
  if (is_refreshing.value || is_loading.value || is_cancelling.value || !order.value || isTerminal.value) return
  is_refreshing.value = true
  const previousStatus = order.value.status
  try {
    await orders_store.fetchOrder(route.params.id, getOrderToken())
    if (previousStatus && order.value?.status && previousStatus !== order.value.status) {
      notifications.info(`Статус заказа №${order.value.id}: ${getOrderStatusLabel(order.value.status)}`)
      if (isTerminal.value && statusRefreshTimer) {
        window.clearInterval(statusRefreshTimer)
        statusRefreshTimer = null
      }
    }
  } catch {
    // Фоновое обновление не должно заменять уже загруженный заказ экраном ошибки.
  } finally {
    is_refreshing.value = false
  }
}
const handleVisibilityChange = () => { if (document.visibilityState === 'visible' && !isTerminal.value) refreshOrderStatus().catch(() => {}) }

onMounted(async () => {
  orders_store.clearCurrentOrder()
  try {
    if (!auth_store.is_initialized) await auth_store.initAuth()
    await orders_store.fetchOrder(route.params.id, getOrderToken())
    if (!isTerminal.value) statusRefreshTimer = window.setInterval(() => { if (document.visibilityState === 'visible') refreshOrderStatus().catch(() => {}) }, 15000)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  } catch (error) {
    error_message.value = error?.data?.message || error?.response?._data?.message || 'Заказ не найден или у вас нет доступа к нему.'
  } finally {
    is_loading.value = false
  }
})

onBeforeUnmount(() => {
  if (statusRefreshTimer) window.clearInterval(statusRefreshTimer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  orders_store.clearCurrentOrder()
})
</script>

<style scoped lang="scss">
.order-view {
  min-height: 70vh;
  padding: 30px 0 64px;
  background:
      radial-gradient(circle at 5% 0%, rgba(174, 133, 80, .12), transparent 26%),
      linear-gradient(180deg, #f8f4ec 0%, #fcfbf8 42%, #f4efe7 100%);
}

.order-view__topbar { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.order-view__back, .order-view__catalog { color: #705333; font-size: 13px; font-weight: 750; text-decoration: none; }
.order-view__back:hover, .order-view__catalog:hover { text-decoration: underline; }

.order-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}
.order-hero__eyebrow { color: #8a6941; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.order-hero h1 { margin: 6px 0 4px; color: #302317; font-size: clamp(34px, 5vw, 48px); letter-spacing: -.045em; }
.order-hero p { margin: 0; color: #7b7166; font-size: 14px; }

.order-status { display: flex; align-items: center; gap: 11px; min-width: 210px; padding: 14px 16px; border: 1px solid rgba(109, 82, 49, .1); border-radius: 16px; background: rgba(255,255,255,.78); }
.order-status__dot { width: 10px; height: 10px; border-radius: 50%; background: #9b7b55; box-shadow: 0 0 0 5px rgba(155,123,85,.12); }
.order-status small { display: block; margin-bottom: 2px; color: #8b8176; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; }
.order-status strong { color: #37291c; font-size: 14px; }.order-status__live{display:flex;align-items:center;gap:5px;margin-top:5px;color:#8a7e72;font-size:9px}.order-status__live i{width:5px;height:5px;border-radius:50%;background:#5f8a62;box-shadow:0 0 0 3px rgba(95,138,98,.1)}.order-status__live i.is-refreshing{animation:order-live-pulse .8s ease-in-out infinite}@keyframes order-live-pulse{50%{opacity:.3}}
.order-status--confirmed .order-status__dot, .order-status--completed .order-status__dot, .order-status--delivered .order-status__dot { background: #3d8a5b; box-shadow: 0 0 0 5px rgba(61,138,91,.12); }
.order-status--cancelled .order-status__dot { background: #b45b4c; box-shadow: 0 0 0 5px rgba(180,91,76,.12); }
.order-status--shipped .order-status__dot { background: #557d9b; box-shadow: 0 0 0 5px rgba(85,125,155,.12); }

.order-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 22px; align-items: start; }
.order-layout__main { display: grid; gap: 18px; min-width: 0; }
.order-card, .order-summary { border-radius: 22px; border: 1px solid rgba(111,82,48,.1); background: rgba(255,253,249,.94); box-shadow: 0 14px 34px rgba(47,35,24,.06); }
.order-card { padding: 22px; }
.order-card__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; padding-bottom: 16px; border-bottom: 1px solid rgba(111,82,48,.1); }
.order-card__head span, .order-summary__eyebrow { color: #8a6941; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .09em; }
.order-card__head h2, .order-summary h2 { margin: 4px 0 0; color: #342719; font-size: 20px; }
.order-card__head > strong { color: #342719; font-size: 20px; }
.order-card__head--simple { align-items: center; }

.order-items { display: grid; }
.order-item { display: grid; grid-template-columns: 68px minmax(0,1fr) auto; gap: 14px; align-items: center; padding: 15px 0; border-bottom: 1px solid rgba(111,82,48,.08); }
.order-item:last-child { padding-bottom: 0; border-bottom: 0; }
.order-item__media { display: grid; place-items: center; width: 68px; height: 68px; overflow: hidden; border-radius: 14px; background: linear-gradient(135deg,#f2e9dc,#e6d8c3); }
.order-item__media img { width: 100%; height: 100%; object-fit: cover; }
.order-item__media span { padding: 6px; color: #785a37; font-size: 9px; font-weight: 800; text-align: center; text-transform: uppercase; }
.order-item__content p { margin: 0 0 3px; color: #92744f; font-size: 10px; font-weight: 750; text-transform: uppercase; letter-spacing: .05em; }
.order-item__content h3 { margin: 0 0 5px; color: #332619; font-size: 15px; }
.order-item__content span { color: #7a7065; font-size: 12px; }
.order-item__total { color: #332619; font-size: 15px; white-space: nowrap; }

.order-details { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px 24px; margin: 18px 0 0; }
.order-details > div { min-width: 0; }
.order-details__wide { grid-column: 1 / -1; }
.order-details dt { margin-bottom: 5px; color: #8b8176; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.order-details dd { margin: 0; color: #382b1e; font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; }
.order-details a { color: inherit; }

.order-summary { position: sticky; top: 24px; padding: 22px; }
.order-summary__rows { display: grid; gap: 11px; margin-top: 20px; padding: 16px 0; border-top: 1px solid rgba(111,82,48,.1); border-bottom: 1px solid rgba(111,82,48,.1); }
.order-summary__rows > div, .order-summary__total { display: flex; justify-content: space-between; gap: 16px; }
.order-summary__rows span { color: #7b7166; font-size: 13px; }
.order-summary__rows strong { color: #3a2b1d; font-size: 13px; }
.order-summary__total { align-items: end; padding: 18px 0 6px; }
.order-summary__total span { color: #665a4d; font-size: 13px; font-weight: 700; }
.order-summary__total strong { color: #302317; font-size: 26px; letter-spacing: -.03em; }
.order-summary__note { margin: 15px 0; padding: 12px; border-radius: 12px; background: #f5efe7; color: #74685c; font-size: 12px; line-height: 1.5; }
.order-summary__button { width: 100%; }.order-summary__cancel{margin-bottom:8px}.order-summary__cancel-note{margin:0 0 12px;color:#7b7166;font-size:11px;line-height:1.45}
.order-view__loading, .order-view__error { max-width: 700px; margin: 30px auto; padding: 28px; border-radius: 22px; }
.order-view__error h1 { margin-top: 0; }

@media (max-width: 900px) {
  .order-layout { grid-template-columns: 1fr; }
  .order-summary { position: static; }
}

@media (max-width: 640px) {
  .order-view { padding-top: 20px; }
  .order-view__catalog { display: none; }
  .order-hero { align-items: stretch; flex-direction: column; }
  .order-status { min-width: 0; }
  .order-card, .order-summary { padding: 17px; border-radius: 18px; }
  .order-item { grid-template-columns: 56px minmax(0,1fr); }
  .order-item__media { width: 56px; height: 56px; }
  .order-item__total { grid-column: 2; }
  .order-details { grid-template-columns: 1fr; gap: 14px; }
  .order-details__wide { grid-column: auto; }
}
</style>
