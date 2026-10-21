<template>
  <article class="cart-item-card">
    <div class="cart-item-card__media-wrap">
      <NuxtLink :to="`/products/${item.product.id}`" class="cart-item-card__media">
        <img
            v-if="product_image"
            :src="product_image"
            :alt="item.product.name"
            class="cart-item-card__image"
        >

        <div v-else class="cart-item-card__image-placeholder">
          <span>{{ item.product.category?.name || 'Товары для лошадей' }}</span>
        </div>
      </NuxtLink>

      <button
          class="cart-item-card__remove"
          type="button"
          aria-label="Удалить товар"
          :disabled="is_removing || is_updating"
          :class="{'is-loading': is_removing}"
          @click="removeItem"
      >
        ×
      </button>
    </div>

    <div class="cart-item-card__body">
      <div class="cart-item-card__topline">
        <p class="cart-item-card__category">{{ item.product.category?.name || 'Товар для лошадей' }}</p>
        <span v-if="item.product.promotion_active" class="cart-item-card__promo">{{ item.product.promo_label || `−${Number(item.product.sale_percent)}%` }}</span>
      </div>

      <h3 class="cart-item-card__title">
        <NuxtLink :to="`/products/${item.product.id}`">
          {{ item.product.name }}
        </NuxtLink>
      </h3>

      <p class="cart-item-card__meta">
        <span v-if="item.product.promotion_active" class="cart-item-card__old-unit">{{ item.product.regular_price }} ₽</span>
        {{ item.product.effective_price ?? item.product.price }} ₽ / шт.
      </p>

      <div class="cart-item-card__quantity cart-item-card__quantity--unified">
        <AppNumberInput
          v-model="local_quantity"
          :min="1"
          :max="Math.max(1, Number(item.product.stock || 1))"
          :step="1"
          compact
          :disabled="is_removing"
          aria-label="Количество товара"
          @change="handleInputChange"
        />
      </div>

      <div class="cart-item-card__bottom">
        <strong class="cart-item-card__price">{{ formatted_local_total }} ₽</strong>
        <span class="cart-item-card__saving" :class="{'is-visible': show_saving}" role="status" aria-live="polite"><i></i>Сохраняем</span>
      </div>
    </div>
  </article>
</template>

<script setup>
import AppNumberInput from '~/components/ui/AppNumberInput.vue'
import './cart-item-card.scss'
import {useCartItemCard} from './useCartItemCard'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const {
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
} = useCartItemCard(props)

const formatted_local_total = computed(() => new Intl.NumberFormat('ru-RU').format(local_total.value))
</script>
