<template>
  <section class="account-orders-page">
    <div class="container">
      <div class="account-orders-page__head">
        <div>
          <span class="account-orders-page__eyebrow">Заказы</span>
          <h1 class="account-orders-page__title">Мои заказы</h1>
          <p class="account-orders-page__text">
            Здесь вы можете посмотреть историю своих заказов и открыть подробную информацию по каждому из них.
          </p>
        </div>

        <NuxtLink to="/" class="btn btn--ghost account-orders-page__back">
          Вернуться в каталог
        </NuxtLink>
      </div>

      <div v-if="orders_store.guest_orders.length" class="account-orders-grid">
        <article
            v-for="item in orders_store.guest_orders"
            :key="item.id"
            class="account-order-card"
        >
          <div class="account-order-card__top">
            <div>
              <span class="account-order-card__label">Заказ</span>
              <h2 class="account-order-card__title">№{{ item.id }}</h2>
            </div>

            <span class="account-order-card__status">
              {{ getStatusText(item.status) }}
            </span>
          </div>

          <div class="account-order-card__meta">
            <div class="account-order-card__meta-item">
              <span class="account-order-card__meta-label">Сумма</span>
              <strong class="account-order-card__meta-value">{{ item.total_price }} ₽</strong>
            </div>

            <div class="account-order-card__meta-item">
              <span class="account-order-card__meta-label">Товаров</span>
              <strong class="account-order-card__meta-value">{{ getItemsCount(item) }}</strong>
            </div>

            <div class="account-order-card__meta-item" v-if="item.created_at">
              <span class="account-order-card__meta-label">Дата</span>
              <strong class="account-order-card__meta-value">{{ formatDate(item.created_at) }}</strong>
            </div>
          </div>

          <div class="account-order-card__bottom">
            <NuxtLink :to="`/orders/${item.id}`" class="btn btn--primary account-order-card__button">
              Открыть заказ
            </NuxtLink>
          </div>
        </article>
      </div>

      <div v-else class="account-orders-empty">
        <div class="account-orders-empty__icon"></div>
        <h2 class="account-orders-empty__title">У вас пока нет заказов</h2>
        <p class="account-orders-empty__text">
          После оформления заказ появится здесь автоматически.
        </p>
        <NuxtLink to="/" class="btn btn--primary">
          Перейти в каталог
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import {useOrdersStore} from '~/stores/orders'
import {getOrderStatusLabel} from '~/utils/order-status'

const orders_store = useOrdersStore()

const getStatusText = getOrderStatusLabel

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

await useAsyncData('guest-orders', () => orders_store.fetchGuestOrders())
</script>