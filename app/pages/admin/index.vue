<template>
  <section class="page-section"><div class="container admin-home">
    <header class="admin-home__head"><span>{{ auth.user?.role==='admin'?'Администратор':'Рабочее место' }}</span><h1 class="page-title">{{ auth.user?.role==='admin'?'Контроль магазина':'Панель менеджера' }}</h1><p>{{ auth.user?.role==='admin'?'Здесь остаются права, команда, аудит и общий контроль. Операционные задачи можно делегировать менеджерам.':'Здесь показаны только разделы, к которым администратор выдал вам доступ.' }}</p></header>
    <div class="admin-home__grid">
      <NuxtLink v-if="can('can_manage_orders')" to="/admin/orders" class="card admin-home__tile"><strong>Заказы</strong><span>Обработка заявок, ответственные и статусы.</span></NuxtLink>
      <NuxtLink v-if="can('can_manage_catalog')" to="/admin/products" class="card admin-home__tile"><strong>Товары</strong><span>Каталог, остатки, акции и медиа.</span></NuxtLink>
      <NuxtLink v-if="can('can_manage_discounts')" to="/admin/discounts" class="card admin-home__tile"><strong>Скидки</strong><span>Уровни скидок от суммы корзины.</span></NuxtLink>
      <NuxtLink v-if="can('can_manage_campaigns')" to="/admin/campaigns" class="card admin-home__tile"><strong>Рассылки</strong><span>Маркетинговые письма подписчикам.</span></NuxtLink>
      <NuxtLink v-if="auth.user?.role==='admin'" to="/admin/team" class="card admin-home__tile"><strong>Команда и права</strong><span>Назначение менеджеров и статистика успешных заказов.</span></NuxtLink>
      <NuxtLink v-if="auth.user?.role==='admin'" to="/admin/audit" class="card admin-home__tile"><strong>История действий</strong><span>Кто и когда менял или удалял данные.</span></NuxtLink>
    </div>
    <div v-if="security" class="card security-summary"><strong>Защита за 24 часа</strong><span>Регистраций: {{ security.registrations_24h }}</span><span>Подтвердили email: {{ security.verified_24h }}</span><span>Ждут подтверждения: {{ security.unverified }}</span><span>Заблокировано rate limit: {{ security.blocked }}</span><small>{{ security.note }}</small></div>
  </div></section>
</template>
<script setup>
import {useAuthStore} from '~/stores/auth'
definePageMeta({layout:'admin',middleware:'staff'})
const auth=useAuthStore();const can=p=>auth.user?.role==='admin'||auth.user?.[p]===true
const security=ref(null)
onMounted(async()=>{if(auth.user?.role==='admin')try{security.value=await auth.authFetch('/api/security/admin/stats')}catch{}})
</script>
<style scoped lang="scss">
.admin-home{max-width:1120px}.admin-home__head{margin-bottom:22px}.admin-home__head>span{color:#896742;font-size:11px;font-weight:850;letter-spacing:.09em;text-transform:uppercase}.admin-home__head h1{margin:6px 0 8px}.admin-home__head p{max-width:760px;margin:0;color:#786c60;line-height:1.6}.admin-home__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}.admin-home__tile{display:grid;gap:7px;padding:20px;text-decoration:none;transition:border-color .18s ease,box-shadow .18s ease,background-color .18s ease}.admin-home__tile:hover{border-color:rgba(117,86,51,.22);box-shadow:0 14px 30px rgba(48,34,19,.08)}.admin-home__tile strong{color:#382a1c;font-size:17px}.admin-home__tile span{color:#7c7064;font-size:12px;line-height:1.5}.security-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:18px}.security-summary strong,.security-summary small{grid-column:1/-1}.security-summary span{padding:12px;border-radius:12px;background:#faf6ef;color:#65594d;font-size:12px}.security-summary small{color:#817568}@media(max-width:760px){.admin-home__grid{grid-template-columns:1fr 1fr}.security-summary{grid-template-columns:1fr 1fr}}@media(max-width:500px){.admin-home__grid,.security-summary{grid-template-columns:1fr}}
</style>
