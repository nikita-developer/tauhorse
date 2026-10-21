<template>
  <aside class="admin-sidebar" :class="{'is-open':is_open}">
    <div class="admin-sidebar__head">
      <h2 class="admin-sidebar__title">Управление магазином</h2>
      <button class="admin-sidebar__toggle" type="button" :aria-expanded="is_open" aria-controls="admin-navigation" @click="is_open=!is_open">
        <span><small>Админка</small><strong>{{ currentLabel }}</strong></span>
        <i aria-hidden="true"><b></b><b></b><b></b></i>
      </button>
    </div>

    <button v-if="is_open" class="admin-sidebar__backdrop" type="button" aria-label="Закрыть меню" @click="is_open=false"></button>

    <nav id="admin-navigation" class="admin-sidebar__nav" aria-label="Разделы управления">
      <div class="admin-sidebar__mobile-head">
        <div><small>Управление</small><strong>Разделы админки</strong></div>
        <button type="button" aria-label="Закрыть меню" @click="is_open=false">×</button>
      </div>
      <span class="admin-sidebar__section admin-sidebar__section--first">Управление</span>
      <NuxtLink to="/admin" @click="is_open=false"><span>Обзор</span><i>›</i></NuxtLink>
      <NuxtLink v-if="can('can_manage_orders')" to="/admin/orders" @click="is_open=false"><span>Заказы</span><i>›</i></NuxtLink>
      <NuxtLink v-if="can('can_manage_catalog')" to="/admin/categories" @click="is_open=false"><span>Категории</span><i>›</i></NuxtLink>
      <NuxtLink v-if="can('can_manage_catalog')" to="/admin/products" @click="is_open=false"><span>Товары</span><i>›</i></NuxtLink>
      <NuxtLink v-if="can('can_manage_discounts')" to="/admin/discounts" @click="is_open=false"><span>Скидки от суммы</span><i>›</i></NuxtLink>
      <NuxtLink v-if="can('can_manage_campaigns')" to="/admin/campaigns" @click="is_open=false"><span>Рассылки</span><i>›</i></NuxtLink>
      <template v-if="auth.user?.role==='admin'">
        <span class="admin-sidebar__section">Контроль</span>
        <NuxtLink to="/admin/team" @click="is_open=false"><span>Команда и права</span><i>›</i></NuxtLink>
        <NuxtLink to="/admin/audit" @click="is_open=false"><span>История действий</span><i>›</i></NuxtLink>
      </template>
    </nav>
  </aside>
</template>

<script setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import './admin-sidebar.scss'
import {useAuthStore} from '~/stores/auth'

const route=useRoute()
const auth=useAuthStore()
const is_open=ref(false)
const can=p=>auth.user?.role==='admin'||auth.user?.[p]===true
const currentLabel=computed(()=>route.path.includes('/team')?'Команда и права':route.path.includes('/audit')?'История действий':route.path.includes('/categories')?'Категории':route.path.includes('/products')?'Товары':route.path.includes('/orders')?'Заказы':route.path.includes('/discounts')?'Скидки от суммы':route.path.includes('/campaigns')?'Рассылки':'Обзор')

watch(()=>route.path,()=>{is_open.value=false})
watch(is_open,value=>{
  if (!import.meta.client) return
  document.body.classList.toggle('admin-mobile-menu-open', value)
})
onBeforeUnmount(()=>{
  if (import.meta.client) document.body.classList.remove('admin-mobile-menu-open')
})
</script>
