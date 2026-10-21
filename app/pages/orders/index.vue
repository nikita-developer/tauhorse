<template>
  <section class="account-orders-page">
    <div class="container">
      <div class="account-orders-page__head">
        <div>
          <span class="account-orders-page__eyebrow">Заказы</span>
          <h1 class="account-orders-page__title">Мои заказы</h1>
          <p class="account-orders-page__text">
            Здесь хранится история заказов, оформленных с этого устройства.
          </p>
        </div>

        <NuxtLink to="/" class="btn btn--ghost account-orders-page__back">
          Вернуться в каталог
        </NuxtLink>
      </div>

      <div v-if="orders_store.guest_orders.length" class="guest-orders-list">
        <article v-for="item in orders_store.guest_orders" :key="item.id" class="guest-order-row">
          <div class="guest-order-row__identity"><span>Заказ</span><strong>№{{ item.id }}</strong><small>{{ formatDate(item.created_at) }}</small></div>
          <div class="guest-order-row__metric"><span>Товаров</span><strong>{{ getItemsCount(item) }}</strong></div>
          <div class="guest-order-row__metric guest-order-row__metric--price"><span>Сумма</span><strong>{{ item.total_price }} ₽</strong></div>
          <span class="guest-order-row__status" :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</span>
          <NuxtLink :to="`/orders/${item.id}`" class="guest-order-row__details">Подробнее <span aria-hidden="true">→</span></NuxtLink>
        </article>
      </div>
      <div v-else class="account-orders-empty">
        <div class="account-orders-empty__icon"></div>
        <h2 class="account-orders-empty__title">У вас пока нет заказов</h2>
        <p class="account-orders-empty__text">
          История появится здесь после оформления заказа без авторизации.
        </p>
        <NuxtLink to="/" class="btn btn--primary">
          Перейти в каталог
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import {onMounted} from 'vue'
import {navigateTo} from '#app'
import {useOrdersStore} from '~/stores/orders'
import {getOrderStatusLabel} from '~/utils/order-status'
import {useAuthStore} from '~/stores/auth'

const auth_store = useAuthStore()
const orders_store = useOrdersStore()

const getStatusText = getOrderStatusLabel

const getStatusClass = status => {
  const success_statuses = ['confirmed', 'paid', 'delivered', 'completed']
  const warning_statuses = ['pending', 'processing', 'shipped']
  const danger_statuses = ['cancelled']

  if (success_statuses.includes(status)) {
    return 'is-success'
  }

  if (warning_statuses.includes(status)) {
    return 'is-warning'
  }

  if (danger_statuses.includes(status)) {
    return 'is-danger'
  }

  return 'is-neutral'
}

const getItemsCount = order => {
  if (!Array.isArray(order.items)) {
    return '—'
  }

  return order.items.reduce((total_count, item) => {
    return total_count + Number(item.quantity || 0)
  }, 0)
}

const formatDate = value => {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

onMounted(async () => {
  if (!auth_store.is_initialized) {
    await auth_store.initAuth()
  }

  if (auth_store.is_authenticated) {
    await navigateTo('/account/orders')
    return
  }

  await orders_store.fetchGuestOrders()
})
</script>

<style scoped lang="scss">
.account-orders-page {
  padding: 32px 0 56px;
  background: radial-gradient(circle at top left, rgba(170, 130, 82, 0.1), transparent 24%),
  linear-gradient(180deg, #f8f4ec 0%, #fcfbf8 38%, #f6f1e8 100%);
}

.account-orders-page__head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}

.account-orders-page__eyebrow {
  display: inline-block;
  margin-bottom: 10px;
  color: #8a6a42;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.account-orders-page__title {
  margin: 0;
  color: #2f2418;
  font-size: 40px;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.account-orders-page__text {
  max-width: 760px;
  margin: 10px 0 0;
  color: #6d675f;
  font-size: 16px;
  line-height: 1.65;
}

.account-orders-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.account-order-card {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid rgba(122, 92, 55, 0.12);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 252, 247, 0.98) 0%, rgba(248, 244, 237, 0.98) 100%);
  box-shadow: 0 18px 36px rgba(44, 31, 18, 0.06),
  inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.account-order-card__top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}

.account-order-card__label {
  display: inline-block;
  margin-bottom: 8px;
  color: #8a6a42;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.account-order-card__title {
  margin: 0;
  color: #2f2418;
  font-size: 28px;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.account-order-card__status {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.account-order-card__status.is-success {
  background: rgba(239, 249, 243, 0.92);
  color: #2f7a52;
  border: 1px solid rgba(53, 122, 82, 0.14);
}

.account-order-card__status.is-warning {
  background: rgba(255, 246, 229, 0.92);
  color: #9a6a1f;
  border: 1px solid rgba(154, 106, 31, 0.14);
}

.account-order-card__status.is-danger {
  background: rgba(252, 241, 239, 0.92);
  color: #b05548;
  border: 1px solid rgba(176, 85, 72, 0.14);
}

.account-order-card__status.is-neutral {
  background: rgba(245, 241, 235, 0.92);
  color: #6b6259;
  border: 1px solid rgba(122, 92, 55, 0.1);
}

.account-order-card__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.account-order-card__meta-item {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid rgba(122, 92, 55, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.56);
}

.account-order-card__meta-label {
  color: #7b7368;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.account-order-card__meta-value {
  color: #2f2418;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.account-order-card__bottom {
  display: flex;
  justify-content: flex-start;
}

.account-order-card__button {
  min-width: 180px;
}

.account-orders-empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 54px 24px;
  border: 1px dashed rgba(122, 92, 55, 0.24);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.72);
  text-align: center;
}

.account-orders-empty__icon {
  width: 62px;
  height: 62px;
  border-radius: 20px;
  background: linear-gradient(180deg, #f1e4cf 0%, #e5d1b2 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.account-orders-empty__title {
  margin: 0;
  color: #2f2418;
  font-size: 28px;
  line-height: 1.1;
}

.account-orders-empty__text {
  max-width: 420px;
  margin: 0;
  color: #6d675f;
  line-height: 1.65;
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
  .account-orders-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .account-orders-page {
    padding: 22px 0 40px;
  }

  .account-orders-page__head {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 22px;
  }

  .account-orders-page__title {
    font-size: 32px;
  }

  .account-order-card {
    padding: 18px;
    border-radius: 22px;
  }

  .account-order-card__title {
    font-size: 24px;
  }

  .account-order-card__meta {
    grid-template-columns: 1fr;
  }

  .account-orders-page__back {
    width: 100%;
  }
}
/* Compact order rows */
.account-orders-grid { grid-template-columns: 1fr; gap: 10px; }
.account-order-card { grid-template-columns: minmax(170px,.8fr) minmax(320px,1.7fr) auto; align-items: center; gap: 18px; padding: 14px 16px; border-radius: 17px; box-shadow: 0 7px 20px rgba(44,31,18,.035); }
.account-order-card__top { align-items: center; }
.account-order-card__label { margin-bottom: 4px; }
.account-order-card__title { font-size: 19px; }
.account-order-card__meta { gap: 0; }
.account-order-card__meta-item { gap: 3px; padding: 2px 14px; border: 0; border-left: 1px solid rgba(122,92,55,.1); border-radius: 0; background: transparent; }
.account-order-card__meta-label { font-size: 10px; }
.account-order-card__meta-value { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.account-order-card__bottom { justify-content: flex-end; }
.account-order-card__button { min-width: 134px; min-height: 40px; padding: 0 13px; font-size: 12px; }
@media (max-width: 760px) {
  .account-order-card { grid-template-columns: 1fr auto; gap: 12px; padding: 14px; }
  .account-order-card__top { grid-column: 1 / -1; }
  .account-order-card__meta { grid-column: 1 / -1; }
  .account-order-card__meta-item { padding: 2px 9px; }
  .account-order-card__meta-item:first-child { padding-left: 0; border-left: 0; }
  .account-order-card__bottom { grid-column: 1 / -1; }
  .account-order-card__button { width: 100%; }
}
@media (max-width: 420px) {
  .account-order-card__meta { grid-template-columns: repeat(2,minmax(0,1fr)); row-gap: 10px; }
  .account-order-card__meta-item:nth-child(3) { grid-column: 1 / -1; padding-left: 0; border-left: 0; }
}

/* Compact guest order list */
.guest-orders-list{display:grid;gap:8px}.guest-order-row{display:grid;grid-template-columns:minmax(120px,.7fr) minmax(100px,.55fr) minmax(120px,.7fr) minmax(110px,.7fr) auto;align-items:center;gap:16px;padding:14px 16px;border:1px solid rgba(111,82,48,.1);border-radius:16px;background:rgba(255,253,249,.94);box-shadow:0 8px 22px rgba(44,31,18,.035)}.guest-order-row__identity,.guest-order-row__metric{display:grid;gap:3px;min-width:0}.guest-order-row__identity span,.guest-order-row__metric span{color:#958777;font-size:9px;font-weight:850;letter-spacing:.065em;text-transform:uppercase}.guest-order-row__identity strong{color:#352719;font-size:19px}.guest-order-row__identity small{color:#84786c;font-size:10px}.guest-order-row__metric strong{color:#443424;font-size:13px}.guest-order-row__metric--price strong{font-size:16px}.guest-order-row__status{justify-self:start;display:inline-flex;align-items:center;min-height:29px;padding:0 10px;border-radius:999px;background:#f2ece4;color:#6d6155;font-size:10px;font-weight:850}.guest-order-row__status.is-success{background:#eaf5ed;color:#39704a}.guest-order-row__status.is-warning{background:#fff4df;color:#93651e}.guest-order-row__status.is-danger{background:#faeae7;color:#a44e42}.guest-order-row__details{justify-self:end;display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:0 12px;border:1px solid rgba(111,82,48,.13);border-radius:11px;background:#fff;color:#62482d;font-size:11px;font-weight:850;text-decoration:none}
@media(max-width:760px){.guest-order-row{grid-template-columns:1fr auto;gap:9px;padding:13px}.guest-order-row__status{grid-column:2;grid-row:1;align-self:start}.guest-order-row__metric{display:flex;align-items:baseline;gap:7px}.guest-order-row__metric--price{grid-column:2;grid-row:2;display:grid;text-align:right}.guest-order-row__details{grid-column:1/-1;justify-self:stretch;justify-content:space-between}}
</style>
