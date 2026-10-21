<template>
  <section class="account-orders-page">
    <div class="container">
      <div class="account-orders-page__head">
        <div>
          <span class="account-orders-page__eyebrow">Личный кабинет</span>
          <h1 class="account-orders-page__title">Мои заказы</h1>
          <p class="account-orders-page__text">История заказов, актуальные статусы и суммы — без лишних деталей.</p>
        </div>
        <NuxtLink to="/" class="btn btn--ghost account-orders-page__back">Вернуться в каталог</NuxtLink>
      </div>

      <section v-if="orders_store.my_orders.length" class="account-orders-filter card" aria-label="Фильтр заказов">
        <label class="account-orders-filter__search"><span>Номер заказа</span><input v-model.trim="orderSearch" class="field__input" inputmode="numeric" placeholder="Например, 42"></label>
        <label><span>Статус</span><AppSelect v-model="statusFilter" :options="statusFilters" aria-label="Статус заказа" /></label>
        <label><span>Порядок</span><AppSelect v-model="sortMode" :options="sortOptions" aria-label="Порядок заказов" /></label>
        <button v-if="hasActiveFilters" class="account-orders-filter__reset" type="button" @click="resetFilters">Сбросить</button>
      </section>

      <div v-if="filteredOrders.length" class="account-orders-list">
        <article v-for="item in filteredOrders" :key="item.id" class="account-order-row">
          <div class="account-order-row__identity">
            <span>Заказ</span>
            <strong>№{{ item.id }}</strong>
            <small>{{ formatDate(item.created_at) }}</small>
          </div>

          <div class="account-order-row__metric">
            <span>Товаров</span>
            <strong>{{ formatItemsCount(getItemsCount(item)) }}</strong>
          </div>

          <div class="account-order-row__metric account-order-row__metric--price">
            <span>Сумма</span>
            <strong>{{ formatPrice(item.total_price) }} ₽</strong>
          </div>

          <span class="account-order-row__status" :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</span>

          <NuxtLink :to="`/orders/${item.id}`" class="account-order-row__details">Подробнее <span aria-hidden="true">→</span></NuxtLink>
        </article>
      </div>

      <div v-else-if="orders_store.my_orders.length" class="account-orders-empty account-orders-empty--filtered">
        <h2 class="account-orders-empty__title">По фильтру ничего не найдено</h2>
        <p class="account-orders-empty__text">Попробуйте другой статус или очистите номер заказа.</p>
        <button type="button" class="btn btn--secondary" @click="resetFilters">Сбросить фильтр</button>
      </div>

      <div v-else class="account-orders-empty">
        <div class="account-orders-empty__icon"></div>
        <h2 class="account-orders-empty__title">У вас пока нет заказов</h2>
        <p class="account-orders-empty__text">Перейдите в каталог, выберите товары и оформите первый заказ.</p>
        <NuxtLink to="/" class="btn btn--primary">Перейти в каталог</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import AppSelect from '~/components/ui/AppSelect.vue'
definePageMeta({middleware: 'auth'})

import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {useOrdersStore} from '~/stores/orders'
import {getOrderStatusLabel} from '~/utils/order-status'

const orders_store = useOrdersStore()
const orderSearch = ref('')
const statusFilter = ref('all')
const sortMode = ref('newest')
const sortOptions = [{value:'newest',label:'Сначала новые'},{value:'oldest',label:'Сначала старые'}]
const statusFilters = [
  {value:'all',label:'Все статусы'},
  {value:'active',label:'В работе'},
  {value:'completed',label:'Завершённые'},
  {value:'cancelled',label:'Отменённые'}
]
const isRefreshing = ref(false)
const activeStatuses = new Set(['pending','confirmed','paid','processing','shipped','delivered'])
const terminalStatuses = new Set(['completed','cancelled'])
const hasLiveOrders = computed(() => orders_store.my_orders.some(item => !terminalStatuses.has(item.status)))
const hasActiveFilters = computed(() => Boolean(orderSearch.value || statusFilter.value !== 'all' || sortMode.value !== 'newest'))
const filteredOrders = computed(() => {
  const needle = orderSearch.value.replace(/[^0-9]/g,'')
  const rows = orders_store.my_orders.filter(item => {
    const matchesNumber = !needle || String(item.id).includes(needle)
    const matchesStatus = statusFilter.value === 'all' || (statusFilter.value === 'active' ? activeStatuses.has(item.status) : item.status === statusFilter.value)
    return matchesNumber && matchesStatus
  })
  return [...rows].sort((a,b) => {
    const delta = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    return sortMode.value === 'newest' ? delta : -delta
  })
})

const getStatusText = getOrderStatusLabel
const getStatusClass = status => {
  if (['confirmed','paid','delivered','completed'].includes(status)) return 'is-success'
  if (['pending','processing','shipped'].includes(status)) return 'is-warning'
  if (status === 'cancelled') return 'is-danger'
  return 'is-neutral'
}
const getItemsCount = order => Array.isArray(order.items) ? order.items.reduce((total,item)=>total+Number(item.quantity||0),0) : 0
const formatItemsCount = count => {
  const value=Number(count||0), mod100=value%100, mod10=value%10
  if(mod100>=11&&mod100<=14)return `${value} товаров`
  if(mod10===1)return `${value} товар`
  if(mod10>=2&&mod10<=4)return `${value} товара`
  return `${value} товаров`
}
const formatPrice = value => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(value||0))
const formatDate = value => {
  if(!value)return '—'
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return value
  return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric'}).format(date)
}

let refreshTimer=null
const refreshOrders=async({force=true}={})=>{
  if(isRefreshing.value||(!force&&!hasLiveOrders.value))return
  isRefreshing.value=true
  try{await orders_store.fetchMyOrders()}finally{isRefreshing.value=false}
}
const resetFilters=()=>{orderSearch.value='';statusFilter.value='all';sortMode.value='newest'}
const handleVisibilityChange=()=>{if(document.visibilityState==='visible'&&hasLiveOrders.value)refreshOrders({force:false}).catch(()=>{})}

onMounted(async()=>{
  await refreshOrders()
  refreshTimer=window.setInterval(()=>{if(document.visibilityState==='visible')refreshOrders({force:false}).catch(()=>{})},30000)
  document.addEventListener('visibilitychange',handleVisibilityChange)
})
onBeforeUnmount(()=>{
  if(refreshTimer)window.clearInterval(refreshTimer)
  document.removeEventListener('visibilitychange',handleVisibilityChange)
})
</script>

<style scoped lang="scss">
.account-orders-page{padding:32px 0 56px;background:radial-gradient(circle at top left,rgba(170,130,82,.1),transparent 24%),linear-gradient(180deg,#f8f4ec 0%,#fcfbf8 38%,#f6f1e8 100%);min-height:calc(100dvh - 120px)}
.account-orders-page__head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:24px}.account-orders-page__eyebrow{display:inline-block;margin-bottom:8px;color:#8a6a42;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.account-orders-page__title{margin:0;color:#2f2418;font-size:40px;line-height:1.05;letter-spacing:-.03em}.account-orders-page__text{max-width:700px;margin:9px 0 0;color:#6d675f;font-size:15px;line-height:1.55}
.account-orders-filter{display:grid;grid-template-columns:minmax(180px,1.2fr) minmax(150px,.8fr) minmax(150px,.8fr) auto;align-items:end;gap:10px;margin-bottom:14px;padding:12px 13px;border-radius:17px}.account-orders-filter label{display:grid;gap:5px;color:#7d7164;font-size:10px;font-weight:800}.account-orders-filter .field__input{min-height:46px;border-radius:13px}.account-orders-filter__reset{min-height:46px;padding:0 13px;border:1px solid rgba(111,82,48,.13);border-radius:13px;background:#f7f1e9;color:#6a5033;font-size:11px;font-weight:800;cursor:pointer}
.account-orders-list{display:grid;gap:8px}.account-order-row{display:grid;grid-template-columns:minmax(120px,.7fr) minmax(120px,.8fr) minmax(120px,.8fr) minmax(110px,.65fr) auto;align-items:center;gap:16px;padding:14px 16px;border:1px solid rgba(111,82,48,.1);border-radius:16px;background:rgba(255,253,249,.94);box-shadow:0 8px 22px rgba(44,31,18,.035);transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease}.account-order-row:hover{border-color:rgba(111,82,48,.2);box-shadow:0 12px 28px rgba(44,31,18,.055);transform:translateY(-1px)}.account-order-row__identity,.account-order-row__metric{display:grid;gap:3px;min-width:0}.account-order-row__identity>span,.account-order-row__metric>span{color:#958777;font-size:9px;font-weight:850;letter-spacing:.065em;text-transform:uppercase}.account-order-row__identity>strong{color:#352719;font-size:19px}.account-order-row__identity>small{color:#84786c;font-size:10px}.account-order-row__metric>strong{overflow:hidden;color:#443424;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.account-order-row__metric--price>strong{font-size:16px}.account-order-row__status{justify-self:start;display:inline-flex;align-items:center;min-height:29px;padding:0 10px;border:1px solid rgba(111,82,48,.1);border-radius:999px;background:#f2ece4;color:#6d6155;font-size:10px;font-weight:850;white-space:nowrap}.account-order-row__status.is-success{border-color:rgba(53,122,82,.14);background:#eaf5ed;color:#39704a}.account-order-row__status.is-warning{border-color:rgba(154,106,31,.14);background:#fff4df;color:#93651e}.account-order-row__status.is-danger{border-color:rgba(176,85,72,.14);background:#faeae7;color:#a44e42}.account-order-row__details{justify-self:end;display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:0 12px;border:1px solid rgba(111,82,48,.13);border-radius:11px;background:#fff;color:#62482d;font-size:11px;font-weight:850;text-decoration:none;white-space:nowrap}.account-order-row__details span{transition:transform .16s ease}.account-order-row__details:hover span{transform:translateX(2px)}
.account-orders-empty{display:grid;justify-items:center;gap:12px;padding:50px 24px;border:1px dashed rgba(122,92,55,.24);border-radius:24px;background:rgba(255,255,255,.72);text-align:center}.account-orders-empty__icon{width:58px;height:58px;border-radius:18px;background:linear-gradient(180deg,#f1e4cf 0%,#e5d1b2 100%)}.account-orders-empty__title{margin:0;color:#2f2418;font-size:26px}.account-orders-empty__text{max-width:420px;margin:0;color:#6d675f;line-height:1.6}
@media(max-width:960px){.account-orders-filter{grid-template-columns:1fr 1fr}.account-orders-filter__search{grid-column:1/-1}.account-orders-filter__reset{align-self:stretch}.account-order-row{grid-template-columns:minmax(105px,.7fr) 1fr auto;gap:11px}.account-order-row__metric--price{grid-column:2;grid-row:1}.account-order-row__metric:not(.account-order-row__metric--price){grid-column:1;grid-row:2}.account-order-row__status{grid-column:2;grid-row:2}.account-order-row__details{grid-column:3;grid-row:1/3}}
@media(max-width:760px){.account-orders-page{padding:22px 0 40px}.account-orders-page__head{align-items:stretch;flex-direction:column;margin-bottom:18px}.account-orders-page__title{font-size:32px}.account-orders-page__text{font-size:13px}.account-orders-page__back{width:100%}.account-orders-filter{grid-template-columns:1fr;padding:11px}.account-orders-filter__search{grid-column:auto}.account-order-row{grid-template-columns:1fr auto;padding:13px 14px;border-radius:14px}.account-order-row__identity{grid-column:1;grid-row:1}.account-order-row__status{grid-column:2;grid-row:1;align-self:start}.account-order-row__metric{grid-column:1!important;grid-row:auto!important;display:flex;align-items:baseline;gap:7px}.account-order-row__metric--price{grid-column:2!important;grid-row:2!important;justify-self:end;display:grid;text-align:right}.account-order-row__details{grid-column:1/-1;grid-row:auto;justify-self:stretch;justify-content:space-between;margin-top:2px}.account-order-row:hover{transform:none}}
</style>
