<template>
  <NuxtPage v-if="is_detail_route" />
  <section v-else class="admin-orders-page page-section">
    <div class="container">
      <header class="admin-orders-head">
        <div><span>Продажи</span><h1>Заказы</h1><p>Сразу видно, кто ведёт заказ и кому он будет засчитан после успешного завершения.</p></div>
        <strong>{{ orders_store.admin_meta?.total || orders_store.admin_orders.length }} всего</strong>
      </header>

      <div class="admin-order-filters card">
        <label><span>Быстрый фильтр</span><AppSelect v-model="quickPreset" :options="quickFilterOptions" aria-label="Быстрый фильтр заказов" @change="applyQuickPreset" /></label>
        <label class="admin-order-filters__email"><span>Email покупателя</span><input v-model="filters.email" class="field__input" type="email" placeholder="Поиск по email"></label>
        <label><span>Статус</span><AppSelect v-model="filters.status" :options="statusSelectOptions" aria-label="Статус заказа" /></label>
        <label class="admin-order-filters__period"><span>Период</span><div><input v-model="filters.date_from" class="field__input" type="date" aria-label="С даты"><i>—</i><input v-model="filters.date_to" class="field__input" type="date" aria-label="По дату"></div></label>
        <label><span>Ответственный</span><AppSelect v-model="filters.assigned_manager_id" :options="assignedManagerOptions" aria-label="Ответственный сейчас" /></label>
        <label v-if="auth.user?.role === 'admin'"><span>Зачтён менеджеру</span><AppSelect v-model="filters.credited_manager_id" :options="creditedManagerOptions" aria-label="Зачтён менеджеру" /></label>
        <button class="admin-order-filters__reset" type="button" :disabled="!hasFilters" aria-label="Сбросить фильтры" title="Сбросить фильтры" @click="resetFilters"><b aria-hidden="true">↺</b></button>
      </div>

      <div v-if="orders_store.admin_orders.length" class="admin-orders-list">
        <article v-for="item in orders_store.admin_orders" :key="item.id" class="admin-order-row">
          <div class="admin-order-row__identity"><strong>№{{ item.id }}</strong><span>{{ formatDate(item.created_at) }}</span></div>
          <div class="admin-order-row__customer"><strong>{{ item.name || 'Покупатель' }}</strong><span>{{ item.email }}</span></div>
          <div class="admin-order-row__total"><span>Сумма</span><strong>{{ formatPrice(item.total_price) }}</strong></div>
          <div class="admin-order-row__manager" :class="{'is-free': !item.assigned_manager}"><span>Ответственный</span><strong>{{ item.assigned_manager?.email || 'Свободный заказ' }}</strong><small v-if="item.assigned_at">с {{ formatCompactDate(item.assigned_at) }}</small></div>
          <div class="admin-order-row__credit" :class="{'is-credited': Boolean(item.credited_manager)}"><span>Зачёт за результат</span><strong>{{ item.credited_manager?.email || 'Пока не засчитан' }}</strong><small v-if="item.completed_at">{{ formatCompactDate(item.completed_at) }}</small></div>
          <span class="admin-order-row__status" :class="`is-${item.status}`">{{ statusText(item.status) }}</span>
          <NuxtLink :to="`/admin/orders/${item.id}`" class="btn btn--secondary">Открыть</NuxtLink>
        </article>
      </div>
      <div v-else class="admin-orders-empty"><h2>Заказы не найдены</h2><p>Измените параметры поиска или дождитесь нового заказа.</p></div>

      <nav v-if="(orders_store.admin_meta?.total_pages || 0) > 1" class="admin-orders-pagination" aria-label="Страницы заказов">
        <button type="button" :disabled="filters.page <= 1" @click="changePage(filters.page - 1)">Назад</button>
        <span>{{ filters.page }} / {{ orders_store.admin_meta.total_pages }}</span>
        <button type="button" :disabled="filters.page >= orders_store.admin_meta.total_pages" @click="changePage(filters.page + 1)">Далее</button>
      </nav>
    </div>
  </section>
</template>

<script setup>
import AppSelect from '~/components/ui/AppSelect.vue'
definePageMeta({layout: 'admin', middleware: 'staff'})
import {useOrdersStore} from '~/stores/orders'
import {useAuthStore} from '~/stores/auth'
import {orderStatusOptions, getOrderStatusLabel} from '~/utils/order-status'

const route = useRoute()
const orders_store = useOrdersStore()
const auth = useAuthStore()
const is_detail_route = computed(() => Boolean(route.params.id))
const loading = ref(false)
const statuses = orderStatusOptions
const statusSelectOptions=[{value:'',label:'Все статусы'},...statuses]
const quickPreset=ref('all')
const quickFilterOptions=[
  {value:'all',label:'Все заказы'},
  {value:'pending',label:'Полученные'},
  {value:'unassigned',label:'Без менеджера'},
  {value:'completed',label:'Завершённые'}
]
const assignedManagerOptions=computed(()=>[{value:'',label:'Все'},{value:'unassigned',label:'Без ответственного'},...orders_store.managers.map(m=>({value:String(m.id),label:m.email}))])
const creditedManagerOptions=computed(()=>[{value:'',label:'Все'},{value:'unassigned',label:'Ещё не засчитан'},...orders_store.managers.map(m=>({value:String(m.id),label:m.email}))])
const filters = reactive({page:1,limit:20,status:'',email:'',sort_by:'created_at',sort_order:'desc',date_from:'',date_to:'',min_total:'',max_total:'',assigned_manager_id:'',credited_manager_id:''})
const hasFilters = computed(() => Boolean(filters.status || filters.email || filters.date_from || filters.date_to || filters.assigned_manager_id || filters.credited_manager_id))
const loadOrders = async () => {
  loading.value = true
  try {
    const q={...filters}
    if(q.assigned_manager_id==='unassigned') q.assigned_manager_id='0'
    if(q.credited_manager_id==='unassigned') q.credited_manager_id='0'
    await orders_store.fetchAdminOrders(q)
  } finally { loading.value = false }
}
const resetFilters = () => { quickPreset.value='all'; Object.assign(filters,{page:1,status:'',email:'',date_from:'',date_to:'',assigned_manager_id:'',credited_manager_id:''}) }
const applyQuickPreset = value => {
  filters.status=''
  filters.assigned_manager_id=''
  filters.credited_manager_id=''
  if(value==='pending') filters.status='pending'
  else if(value==='unassigned') filters.assigned_manager_id='unassigned'
  else if(value==='completed') filters.status='completed'
}
const changePage = async page => { filters.page = page; await loadOrders(); window.scrollTo({top:0,behavior:'smooth'}) }
const statusText = getOrderStatusLabel
const formatPrice = value => new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number(value || 0))
const formatDate = value => value ? new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)) : 'Без даты'
const formatCompactDate = value => value ? new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value)) : ''

let filterTimer
watch(
  () => [filters.status, filters.email, filters.date_from, filters.date_to, filters.assigned_manager_id, filters.credited_manager_id],
  () => {
    filters.page = 1
    clearTimeout(filterTimer)
    filterTimer = setTimeout(() => loadOrders(), 250)
  }
)
onBeforeUnmount(() => clearTimeout(filterTimer))
await useAsyncData('admin-orders', async()=>{if(!auth.is_initialized)await auth.initAuth();await Promise.all([loadOrders(),orders_store.fetchManagers()])})
</script>

<style scoped lang="scss">
.admin-orders-page{background:#f8f5ef;min-height:calc(100dvh - 124px)}
.admin-orders-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:14px}.admin-orders-head>div>span{color:#896742;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.admin-orders-head h1{margin:5px 0 4px;color:#342719;font-size:38px;letter-spacing:-.035em}.admin-orders-head p{margin:0;color:#7a7065}.admin-orders-head>strong{padding:8px 12px;border-radius:999px;background:#ede4d7;color:#684d2f;font-size:12px}
.admin-order-filters{display:grid;grid-template-columns:minmax(100px,.78fr) minmax(130px,1.1fr) minmax(108px,.82fr) minmax(220px,1.45fr) minmax(118px,1fr) minmax(118px,1fr) 42px;align-items:end;gap:7px;margin-bottom:16px;padding:12px;border-radius:17px;overflow:visible}.admin-order-filters>*{min-width:0}.admin-order-filters label{display:grid;gap:5px;min-width:0;color:#74695e;font-size:9px;font-weight:800;letter-spacing:.02em}.admin-order-filters .field__input{width:100%;min-width:0;min-height:42px;padding-inline:10px;border-radius:11px;font-size:11px}.admin-order-filters input[type=date]{min-width:0;padding-inline:7px;font-size:10px}.admin-order-filters :deep(.app-select){width:100%;min-width:0}.admin-order-filters :deep(.app-select__trigger){min-width:0;min-height:42px;padding-inline:10px;border-radius:11px;font-size:11px}.admin-order-filters__period>div{display:grid;grid-template-columns:minmax(0,1fr) 10px minmax(0,1fr);align-items:center;gap:4px;min-width:0}.admin-order-filters__period i{color:#a09284;font-style:normal;text-align:center}.admin-order-filters__reset{display:grid;place-items:center;width:42px;min-width:42px;height:42px;padding:0;border:1px solid rgba(111,82,48,.12);border-radius:11px;background:#f7f1e9;color:#725638;font-size:10px;font-weight:800;cursor:pointer;transition:background-color .16s ease,opacity .16s ease}.admin-order-filters__reset b{font-size:19px;line-height:1}.admin-order-filters__reset:disabled{opacity:.35;cursor:default}.admin-order-filters__reset:hover:not(:disabled){background:#eee5d9}
.admin-orders-list{display:grid;gap:8px}.admin-order-row{display:grid;grid-template-columns:76px minmax(145px,1fr) 105px minmax(150px,1fr) minmax(150px,1fr) 105px 76px;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(111,82,48,.09);border-radius:15px;background:#fff}.admin-order-row__identity,.admin-order-row__customer,.admin-order-row__total,.admin-order-row__manager,.admin-order-row__credit{display:grid;gap:3px;min-width:0}.admin-order-row__identity strong{color:#392a1c;font-size:16px}.admin-order-row__identity span,.admin-order-row__customer span,.admin-order-row__total span,.admin-order-row__manager span,.admin-order-row__credit span{overflow:hidden;color:#938678;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.admin-order-row__customer strong,.admin-order-row__manager strong,.admin-order-row__credit strong{overflow:hidden;color:#514131;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.admin-order-row__manager small,.admin-order-row__credit small{color:#a09284;font-size:9px}.admin-order-row__manager.is-free strong{color:#a66535}.admin-order-row__credit.is-credited strong{color:#3d724b}.admin-order-row__total strong{color:#42311f;font-size:13px}.admin-order-row__status{justify-self:start;padding:6px 8px;border-radius:999px;background:#f3ede5;color:#755f46;font-size:10px;font-weight:800;white-space:nowrap}.admin-order-row__status.is-cancelled{background:#fbe9e6;color:#a64d42}.admin-order-row__status.is-completed,.admin-order-row__status.is-delivered,.admin-order-row__status.is-paid{background:#e9f4eb;color:#39704a}.admin-order-row .btn{min-height:36px;padding:0 10px;font-size:11px}
.admin-orders-empty{padding:44px 20px;border:1px dashed rgba(111,82,48,.2);border-radius:18px;background:#fff;text-align:center}.admin-orders-empty h2,.admin-orders-empty p{margin:0}.admin-orders-empty p{margin-top:7px;color:#7a7065}.admin-orders-pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:18px}.admin-orders-pagination button{padding:8px 11px;border:1px solid rgba(111,82,48,.13);border-radius:9px;background:#fff;cursor:pointer}.admin-orders-pagination button:disabled{opacity:.4;cursor:not-allowed}.admin-orders-pagination span{color:#74685b;font-size:12px}
@media(max-width:1180px){.admin-order-filters{grid-template-columns:repeat(3,minmax(0,1fr))}.admin-order-filters__period{grid-column:span 2}.admin-order-filters__reset{align-self:end}.admin-order-row{grid-template-columns:76px minmax(145px,1fr) 100px minmax(150px,1fr) 105px 76px}.admin-order-row__credit{grid-column:2/5;grid-row:2;display:flex;align-items:center;gap:8px}.admin-order-row__credit span{flex:0 0 auto}}
@media(max-width:760px){.admin-orders-head{align-items:start;flex-direction:column}.admin-orders-head h1{font-size:32px}.admin-order-filters{grid-template-columns:1fr 1fr}.admin-order-row{grid-template-columns:1fr auto;gap:9px;padding:13px}.admin-order-row__customer{grid-column:1/-1;grid-row:2}.admin-order-row__total{grid-column:2;grid-row:1;text-align:right}.admin-order-row__manager{grid-column:1/-1;grid-row:3}.admin-order-row__credit{grid-column:1/-1;grid-row:4;display:grid}.admin-order-row__status{grid-column:1;grid-row:5}.admin-order-row>.btn{grid-column:2;grid-row:5;min-width:92px}}
@media(max-width:520px){.admin-order-filters{grid-template-columns:1fr}.admin-order-filters__period{grid-column:auto}.admin-order-filters__reset{width:100%}}
</style>
