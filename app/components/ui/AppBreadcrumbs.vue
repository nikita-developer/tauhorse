<template>
  <nav v-if="items.length" class="breadcrumbs" aria-label="Хлебные крошки">
    <div class="container breadcrumbs__scroll">
      <NuxtLink to="/" class="breadcrumbs__home" aria-label="Главная">⌂</NuxtLink>
      <template v-for="(item, index) in items" :key="`${item.to}-${index}`">
        <span class="breadcrumbs__separator" aria-hidden="true">›</span>
        <NuxtLink v-if="item.to && index < items.length - 1" :to="item.to">{{ item.label }}</NuxtLink>
        <span v-else class="breadcrumbs__current" aria-current="page">{{ item.label }}</span>
      </template>
    </div>
  </nav>
</template>

<script setup>
import {computed} from 'vue'
import {useProductsStore} from '~/stores/products'

const route = useRoute()
const products = useProductsStore()
const labels = {
  about: 'О магазине', faq: 'Вопросы и ответы', 'feeding-guide': 'Как подобрать корм', contacts: 'Контакты',
  cart: 'Корзина', checkout: 'Оформление заказа', login: 'Вход', register: 'Регистрация',
  orders: 'Заказы', account: 'Личный кабинет', admin: 'Админка', products: 'Товары', categories: 'Категории', team: 'Команда и права', audit: 'История действий',
  legal: 'Покупателям', delivery: 'Доставка и оплата', terms: 'Публичная оферта', returns: 'Возврат и претензии', privacy: 'Персональные данные', cookies: 'Cookie', requisites: 'Реквизиты', 'personal-data-consent': 'Согласие на ПД', 'marketing-consent': 'Рекламная рассылка'
}

const items = computed(() => {
  if (route.path === '/') return []
  const segments = route.path.split('/').filter(Boolean)
  return segments.map((segment, index) => {
    const is_product_id = segments[index - 1] === 'products' && /^\d+$/.test(segment)
    const is_order_id = segments[index - 1] === 'orders' && /^\d+$/.test(segment)
    const is_product_root = segment === 'products' && /^\d+$/.test(segments[index + 1] || '')
    return {
      label: is_product_root ? 'Каталог' : is_product_id ? (products.product?.name || 'Карточка товара') : is_order_id ? `Заказ №${segment}` : (labels[segment] || segment),
      to: is_product_root ? '/' : `/${segments.slice(0, index + 1).join('/')}`
    }
  })
})
</script>

<style scoped lang="scss">
.breadcrumbs { border-bottom: 1px solid rgba(111,82,48,.07); background: rgba(250,247,241,.88); }
.breadcrumbs__scroll { display: flex; align-items: center; gap: 9px; min-height: 42px; overflow-x: auto; color: #867765; font-size: 12px; scrollbar-width: none; white-space: nowrap; }
.breadcrumbs__scroll::-webkit-scrollbar { display: none; }
.breadcrumbs a { color: #776754; transition: color .2s ease; }
.breadcrumbs a:hover { color: #3f2f1e; }
.breadcrumbs__home { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 8px; background: #eee4d7; color: #6f5230 !important; font-size: 15px; }
.breadcrumbs__separator { color: #b3a696; }
.breadcrumbs__current { max-width: min(420px, 55vw); overflow: hidden; color: #453522; font-weight: 650; text-overflow: ellipsis; }
@media (max-width: 560px) { .breadcrumbs__scroll { min-height: 38px; gap: 7px; font-size: 11px; } }
</style>
