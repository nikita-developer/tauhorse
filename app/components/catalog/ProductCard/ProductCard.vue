<template>
  <article class="product-card">
    <div class="product-card__media" @touchstart.passive="handleTouchStart" @touchend.passive="handleTouchEnd">
      <NuxtLink :to="`/products/${product.id}`" class="product-card__image-link" @click="handleMediaLinkClick">
        <Transition :name="media_transition_name">
          <img v-if="product_image" :key="media_key" :src="product_image" :alt="product.name" class="product-card__image" loading="lazy" decoding="async" @error="handleImageError">
          <video v-else-if="product_video" :key="media_key" :src="product_video" class="product-card__image" muted playsinline preload="metadata"></video>
          <div v-else :key="media_key" class="product-card__image-placeholder"><span>{{ product.category?.name || 'TauHorse' }}</span></div>
        </Transition>
      </NuxtLink>

      <template v-if="has_multiple_media">
        <button class="product-card__media-arrow product-card__media-arrow--prev" type="button" aria-label="Предыдущее изображение" @click.stop="previousMedia">‹</button>
        <button class="product-card__media-arrow product-card__media-arrow--next" type="button" aria-label="Следующее изображение" @click.stop="nextMedia">›</button>
        <span class="product-card__media-count" aria-live="polite">{{ media_position }}</span>
      </template>

      <div class="product-card__badges">
        <span class="product-card__badge product-card__badge--category">{{ product.category?.name || 'Без категории' }}</span>
        <span v-if="product.promotion_active" class="product-card__badge product-card__badge--sale">{{ product.promo_label || `−${Number(product.sale_percent)}%` }}</span>
        <span v-if="product.is_featured" class="product-card__badge product-card__badge--featured">Рекомендуем</span>
        <span class="product-card__badge" :class="product.stock > 0 ? 'product-card__badge--stock' : 'product-card__badge--empty'">{{ product.stock > 0 ? 'В наличии' : 'Нет в наличии' }}</span>
      </div>
    </div>

    <div class="product-card__body">
      <div class="product-card__content">
        <h3 class="product-card__title"><NuxtLink :to="`/products/${product.id}`">{{ product.name }}</NuxtLink></h3>
        <p class="product-card__description">{{ product.description || 'Описание товара пока не добавлено' }}</p>
      </div>

      <div class="product-card__bottom">
        <div><span v-if="promotion_active" class="product-card__old-price">{{ new Intl.NumberFormat('ru-RU').format(regular_price) }} ₽</span><strong class="product-card__price">{{ formatted_price }}</strong></div>
        <button v-if="!is_in_cart" class="btn btn--primary product-card__button" :disabled="product.stock <= 0 || is_updating" type="button" @click="addToCart"><span class="product-card__button-label">{{ product.stock > 0 ? 'В корзину' : 'Нет в наличии' }}</span></button>
        <div v-else class="product-card__quantity" aria-label="Количество товара в корзине">
          <button class="product-card__qty-button" type="button" aria-label="Уменьшить количество" :disabled="is_updating" @click="decreaseQuantity">−</button>
          <span class="product-card__qty-value" aria-live="polite">{{ cart_quantity }}</span>
          <button class="product-card__qty-button" type="button" aria-label="Увеличить количество" :disabled="is_updating || !can_increase" @click="increaseQuantity">+</button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import './product-card.scss'
import {useProductCard} from './useProductCard'
const props = defineProps({product: {type: Object, required: true}})
const {
  product_video, product_image, media_key, media_transition_name, has_multiple_media, media_position, nextMedia, previousMedia,
  handleTouchStart, handleTouchEnd, handleMediaLinkClick, formatted_price, regular_price,
  promotion_active, addToCart, increaseQuantity, decreaseQuantity, cart_quantity, is_in_cart,
  can_increase, is_updating, handleImageError
} = useProductCard(props)
</script>
