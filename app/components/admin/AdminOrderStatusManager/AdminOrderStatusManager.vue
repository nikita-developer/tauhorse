<template>
  <div class="admin-order-status-manager card">
    <h3>Управление статусом</h3>

    <div class="admin-order-status-manager__row">
      <AppSelect v-model="selected_status" :options="status_options" placeholder="Выберите статус" aria-label="Новый статус заказа" />

      <button class="btn btn--primary" :class="{'is-loading': is_updating}" :disabled="!selected_status || is_updating" @click="updateStatus">{{ is_updating ? 'Обновляем…' : 'Обновить' }}</button>
    </div>
  </div>
</template>

<script setup>
import AppSelect from '~/components/ui/AppSelect.vue'
import './admin-order-status-manager.scss'
import { useAdminOrderStatusManager } from './useAdminOrderStatusManager'
import {getOrderStatusLabel} from '~/utils/order-status'

const props = defineProps({
  order_id: {
    type: Number,
    required: true
  }
})

const { selected_status, normalized_options, updateStatus, is_updating } = useAdminOrderStatusManager(props)
const status_options = computed(() => [{value:'',label:'Выберите статус',disabled:true},...normalized_options.value.map(item => ({value:item,label:getOrderStatusLabel(item)}))])
</script>
