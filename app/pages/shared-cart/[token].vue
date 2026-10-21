<template>
  <section class="shared-cart-page page-section">
    <div class="container shared-cart-page__inner">
      <header class="shared-cart-head">
        <span>Поделились с вами</span>
        <h1 class="page-title">Общая корзина</h1>
        <p>Это снимок состава корзины. Цены, акции и наличие берутся из магазина заново, поэтому вы видите актуальные условия.</p>
      </header>

      <div v-if="pending" class="card shared-cart-state">Загружаем корзину…</div>
      <div v-else-if="error" class="card shared-cart-state shared-cart-state--error">Ссылка недействительна или истекла.</div>

      <template v-else>
        <div class="shared-cart-list">
          <article v-for="item in data.items" :key="item.id" class="card shared-cart-item">
            <div class="shared-cart-item__media">
              <img v-if="item.product.media?.find(media => media.media_type === 'image')?.url || item.product.image_url" :src="item.product.media?.find(media => media.media_type === 'image')?.url || item.product.image_url" :alt="item.product.name">
              <span v-else>Нет фото</span>
            </div>
            <div class="shared-cart-item__main">
              <div class="shared-cart-item__badges">
                <span>{{ item.product.category?.name || 'Без категории' }}</span>
                <span v-if="item.product.promotion_active" class="is-sale">{{ item.product.promo_label || `−${Number(item.product.sale_percent)}%` }}</span>
              </div>
              <NuxtLink :to="`/products/${item.product.id}`"><strong>{{ item.product.name }}</strong></NuxtLink>
              <p>{{ item.quantity }} шт. × <span v-if="item.product.promotion_active" class="shared-cart-item__old">{{ money(item.product.regular_price) }}</span> {{ money(item.product.effective_price ?? item.product.price) }}</p>
            </div>
          </article>
        </div>

        <div class="card shared-cart-action">
          <div><strong>{{ data.items.length ? 'Добавить эту подборку в вашу корзину?' : 'Доступных товаров в этой корзине больше нет' }}</strong><p v-if="data.expires_at">Ссылка действует до {{ new Date(data.expires_at).toLocaleDateString('ru-RU') }}.</p></div>
          <button v-if="data.items.length" class="btn btn--primary" :class="{'is-loading': importing}" :disabled="importing" @click="importCart">{{ importing ? 'Добавляем…' : 'Добавить всё в мою корзину' }}</button>
        </div>
        <p v-if="message" class="shared-cart-message">{{ message }}</p>
      </template>
    </div>
  </section>
</template>

<script setup>
import {ref} from 'vue'
import {useRoute,navigateTo} from '#app'
import {createApiUrl} from '~/utils/api'
import {useCartStore} from '~/stores/cart'

const route=useRoute()
const cart=useCartStore()
const message=ref('')
const importing=ref(false)
const money=value=>`${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(value||0))} ₽`
const {data,pending,error}=await useFetch(createApiUrl(`/shared-carts/${route.params.token}`))
const importCart=async()=>{
  importing.value=true
  message.value=''
  try{await cart.apiFetch(`/shared-carts/${route.params.token}/import`,{method:'POST'});await cart.fetchCart();await navigateTo('/cart')}
  catch(e){message.value=e?.data?.message||'Не удалось добавить корзину'}
  finally{importing.value=false}
}
</script>

<style scoped lang="scss">
.shared-cart-page{background:#f8f5ef;min-height:60vh}.shared-cart-page__inner{max-width:900px}.shared-cart-head{margin-bottom:20px}.shared-cart-head>span{color:#8a6a42;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.shared-cart-head .page-title{margin:6px 0 8px}.shared-cart-head p{max-width:720px;margin:0;color:#756a5e;line-height:1.6}.shared-cart-state{padding:24px}.shared-cart-state--error{color:#9b493f}.shared-cart-list{display:grid;gap:10px}.shared-cart-item{display:grid;grid-template-columns:82px 1fr;gap:14px;padding:12px}.shared-cart-item__media{display:grid;place-items:center;width:82px;height:82px;overflow:hidden;border-radius:13px;background:#eee5d9;color:#998773;font-size:10px}.shared-cart-item__media img{width:100%;height:100%;object-fit:cover}.shared-cart-item__main{min-width:0}.shared-cart-item__main>a>strong{display:block;margin:7px 0 6px;color:#38291b;font-size:16px}.shared-cart-item__main p{margin:0;color:#75695d;font-size:13px}.shared-cart-item__badges{display:flex;flex-wrap:wrap;gap:5px}.shared-cart-item__badges span{max-width:210px;overflow:hidden;padding:4px 7px;border-radius:999px;background:#f1ebe2;color:#70593e;font-size:9px;font-weight:800;text-overflow:ellipsis;white-space:nowrap}.shared-cart-item__badges span.is-sale{background:#7d2e2e;color:#fff}.shared-cart-item__old{text-decoration:line-through;opacity:.55}.shared-cart-action{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:18px;padding:20px}.shared-cart-action strong{color:#392b1e}.shared-cart-action p{margin:5px 0 0;color:#7d7165;font-size:12px}.shared-cart-message{color:#9b493f}@media(max-width:620px){.shared-cart-item{grid-template-columns:66px 1fr}.shared-cart-item__media{width:66px;height:66px}.shared-cart-action{align-items:stretch;flex-direction:column}.shared-cart-action .btn{width:100%}}
</style>
