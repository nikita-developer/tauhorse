<template>
  <section class="order-detail page-section"><div class="container">
    <NuxtLink to="/admin/orders" class="order-detail__back">← Все заказы</NuxtLink>
    <div v-if="loading" class="card order-state"><i></i><div><strong>Загружаем заказ</strong><p>Получаем состав и историю…</p></div></div>
    <div v-else-if="errorMessage" class="card order-state"><div><strong>Не удалось открыть заказ</strong><p>{{ errorMessage }}</p></div><button class="btn btn--secondary" @click="loadOrder">Повторить</button></div>
    <template v-else-if="order">
      <header class="order-detail__head"><div><span>Заказ</span><h1>№{{ order.id }}</h1><p>{{ formatDate(order.created_at) }}</p></div><div class="order-detail__total"><small>{{ order.delivery_method !== 'pickup' && order.delivery_price_confirmed !== true ? 'Сумма товаров' : 'Итого' }}</small><strong>{{ formatPrice(order.total_price) }}</strong><em>{{ statusText(order.status) }}</em></div></header>
      <div class="order-detail__layout">
        <main>
          <section class="card order-block customer-block">
            <div class="order-block__head">
              <div><h2>Покупатель</h2><p v-if="canEditCustomer" class="muted">Контактные данные и способ получения можно исправить без изменения состава заказа.</p><p v-else class="muted">После отправки, доставки, завершения или отмены контактные данные фиксируются.</p></div>
              <button v-if="canEditCustomer && !editingCustomer" class="btn btn--secondary customer-edit__button" type="button" @click="startCustomerEdit">Редактировать</button>
            </div>

            <form v-if="editingCustomer" class="customer-edit" @submit.prevent="saveCustomer">
              <label class="field"><span>Имя</span><input v-model="customerForm.name" class="field__input" type="text" maxlength="120" required></label>
              <label class="field"><span>Email</span><input v-model="customerForm.email" class="field__input" type="email" maxlength="254" required></label>
              <label class="field"><span>Телефон</span><input v-model="customerForm.phone" class="field__input" type="tel" maxlength="50" required></label>
              <label class="field"><span>Получение</span><AppSelect v-model="customerForm.delivery_method" :options="deliveryOptions" aria-label="Способ получения" /></label>
              <label v-if="needsDeliveryDetails(customerForm.delivery_method)" class="field customer-edit__wide"><span>Данные доставки</span><textarea v-model="customerForm.address" class="field__textarea" maxlength="500" rows="3" placeholder="Адрес, город, ПВЗ или пожелания покупателя" required></textarea></label>
              <label v-if="usesPostalCode(customerForm.delivery_method)" class="field"><span>Почтовый индекс</span><input v-model="customerForm.postal_code" class="field__input" maxlength="20"></label>
              <label v-if="customerForm.delivery_method !== 'pickup'" class="field"><span>Стоимость доставки, ₽</span><AppNumberInput v-model="customerForm.delivery_price" :min="0" :max="1000000" :step="0.01" placeholder="Пусто = по согласованию" suffix="₽" aria-label="Стоимость доставки" /><small>Пустое поле означает, что тариф ещё не подтверждён покупателю.</small></label>
              <label class="field customer-edit__wide"><span>Комментарий</span><textarea v-model="customerForm.comment" class="field__textarea" maxlength="1000" rows="4"></textarea><small class="field-counter">{{ customerForm.comment.length }}/1000</small></label>
              <div class="customer-edit__actions customer-edit__wide"><button class="btn btn--secondary" type="button" :disabled="savingCustomer" @click="cancelCustomerEdit">Отмена</button><button class="btn btn--primary" type="submit" :class="{'is-loading':savingCustomer}" :disabled="savingCustomer">{{ savingCustomer ? 'Сохраняем…' : 'Сохранить изменения' }}</button></div>
            </form>

            <dl v-else class="order-info"><div><dt>Имя</dt><dd>{{ order.name }}</dd></div><div><dt>Email</dt><dd>{{ order.email }}</dd></div><div><dt>Телефон</dt><dd>{{ order.phone }}</dd></div><div><dt>Получение</dt><dd>{{ getDeliveryMethodLabel(order.delivery_method) }}</dd></div><div v-if="needsDeliveryDetails(order.delivery_method)" class="wide"><dt>Данные доставки</dt><dd>{{ order.address }}</dd></div><div v-if="order.postal_code && usesPostalCode(order.delivery_method)"><dt>Почтовый индекс</dt><dd>{{ order.postal_code }}</dd></div><div><dt>Тариф доставки</dt><dd>{{ getDeliveryPriceLabel(order) }}</dd></div><div v-if="order.comment" class="wide"><dt>Комментарий</dt><dd>{{ order.comment }}</dd></div></dl>
          </section>
          <section class="card order-block"><h2>Состав заказа</h2><div class="order-products"><article v-for="item in order.items" :key="item.id"><img v-if="item.product?.image_url" :src="item.product.image_url" :alt="item.product?.name || ''"><span v-else class="order-products__photo">Фото</span><div><strong>{{ item.product?.name || `Товар #${item.product_id}` }}</strong><small>{{ item.quantity }} × {{ formatPrice(item.price) }}</small></div><b>{{ formatPrice(Number(item.price) * item.quantity) }}</b></article></div><div class="order-totals"><div class="order-totals__breakdown"><div><span>Товары</span><strong>{{ formatPrice(order.subtotal) }}</strong></div><div><span>Доставка</span><strong>{{ getDeliveryPriceLabel(order) }}</strong></div></div><div v-if="Number(order.discount_amount||0)>0" class="order-totals__discount"><span>Скидка от суммы {{ Number(order.discount_percent||0) }}%</span><strong>−{{ formatPrice(order.discount_amount) }}</strong></div><div class="order-totals__grand"><span>{{ order.delivery_method !== 'pickup' && order.delivery_price_confirmed !== true ? 'Сумма товаров' : 'Итого' }}</span><strong>{{ formatPrice(order.total_price) }}</strong></div><p v-if="order.delivery_method !== 'pickup' && order.delivery_price_confirmed !== true" class="order-totals__note">Стоимость доставки ещё не согласована и не включена в сумму.</p></div></section>
        </main>
        <aside>
          <section class="card order-block assignment-block">
            <h2>Ответственный и зачёт</h2>
            <p class="muted">«Ответственный» показывает, кто ведёт заказ сейчас. «Зачёт» фиксируется навсегда только после успешного завершения и используется для статистики менеджеров.</p>
            <div class="assignment-grid">
              <div class="assignment-current" :class="{'is-empty':!order.assigned_manager}">
                <span>Сейчас обрабатывает</span>
                <strong>{{ order.assigned_manager?.email || 'Не назначен' }}</strong>
                <small v-if="order.assigned_at">Назначен {{ formatDate(order.assigned_at,true) }}</small>
              </div>
              <div class="assignment-current assignment-current--credit" :class="{'is-empty':!order.credited_manager}">
                <span>Зачёт за успешный заказ</span>
                <strong>{{ order.credited_manager?.email || 'Ещё не засчитан' }}</strong>
                <small v-if="order.completed_at">Завершён {{ formatDate(order.completed_at,true) }}</small>
              </div>
            </div>
            <template v-if="auth.user?.role==='admin'">
              <label class="field"><span class="field__label">Назначить / переназначить менеджера</span><AppSelect v-model="assignedManagerId" :options="managerOptions" aria-label="Ответственный менеджер" /></label>
              <button class="btn btn--secondary" :disabled="savingAssignment" @click="saveAssignment">{{ savingAssignment?'Сохраняем…':'Сохранить ответственного' }}</button>
            </template>
            <button v-else-if="!order.assigned_manager" class="btn btn--primary" :disabled="savingAssignment" @click="claimOrder">{{ savingAssignment?'Назначаем…':'Взять заказ в работу' }}</button>
          </section>
          <AdminOrderStatusManager :order_id="orderId"/>
          <section class="card order-block admin-note"><h2>Внутренняя заметка</h2><p class="muted">Видна только в админке. Состав и стоимость товаров здесь не меняются.</p><textarea v-model="adminNote" class="field__input admin-note__input" maxlength="2000" rows="5" placeholder="Например: согласовать время доставки после 18:00"></textarea><div class="admin-note__actions"><small>{{ adminNote.length }}/2000</small><button class="btn btn--primary" :class="{'is-loading':savingNote}" :disabled="savingNote" @click="saveAdminNote">{{ savingNote ? 'Сохраняем…' : 'Сохранить заметку' }}</button></div></section>
          <section class="card order-block"><h2>История обработки</h2><div v-if="ordersStore.activity.length" class="order-activity"><article v-for="item in ordersStore.activity" :key="item.id"><i></i><div><strong>{{ activityTitle(item) }}</strong><span>{{ activityDescription(item) }}</span><small>{{ formatDate(item.created_at,true) }} · {{ item.actor?.email || (item.action==='order.customer_cancel'?'покупатель':'система') }}</small></div></article></div><p v-else class="muted">Действий с заказом пока не было.</p></section>
          <section class="card order-block"><h2>История статусов</h2><div v-if="ordersStore.status_history.length" class="order-history"><article v-for="item in ordersStore.status_history" :key="item.id"><i></i><div><strong>{{ statusText(item.to_status) }}</strong><small>{{ formatDate(item.created_at, true) }} · {{ item.change_source==='customer'?'покупатель':(item.changed_by_user?.email||'система') }}</small></div></article></div><p v-else class="muted">Изменений пока не было.</p></section>
        </aside>
      </div>
    </template>
  </div></section>
</template>

<script setup>
import AppNumberInput from '~/components/ui/AppNumberInput.vue'
import AppSelect from '~/components/ui/AppSelect.vue'
import AdminOrderStatusManager from '~/components/admin/AdminOrderStatusManager/AdminOrderStatusManager.vue'
import {useOrdersStore} from '~/stores/orders'
import {getOrderStatusLabel} from '~/utils/order-status'
import {getDeliveryMethodLabel, getDeliveryPriceLabel, needsDeliveryDetails, usesPostalCode} from '~/utils/delivery'
import {useNotificationsStore} from '~/stores/notifications'
import {useAuthStore} from '~/stores/auth'
definePageMeta({layout:'admin',middleware:'staff',pageTransition:false})
const route=useRoute();const ordersStore=useOrdersStore();const notifications=useNotificationsStore();const auth=useAuthStore();const orderId=Number(route.params.id);const loading=ref(true);const errorMessage=ref('');const savingNote=ref(false);const savingCustomer=ref(false);const editingCustomer=ref(false);const adminNote=ref('');
const savingAssignment=ref(false);const assignedManagerId=ref('');
const customerForm=reactive({name:'',email:'',phone:'',delivery_method:'seller_courier',address:'',postal_code:'',delivery_price:'',comment:''})
const deliveryOptions=[{value:'seller_courier',label:'Доставка продавцом'},{value:'russian_post',label:'Почта России'},{value:'pickup_point',label:'Пункт выдачи / сервис доставки'},{value:'transport_company',label:'Транспортная компания'},{value:'pickup',label:'Самовывоз'},{value:'other',label:'Другой способ'},{value:'courier',label:'Курьерская доставка (старые заказы)'}]
const managerOptions=computed(()=>[{value:'',label:'Без ответственного'},...ordersStore.managers.map(m=>({value:String(m.id),label:m.email}))])
const order=computed(()=>ordersStore.order?.id===orderId?ordersStore.order:null)
const canEditCustomer=computed(()=>order.value&&!['shipped','delivered','completed','cancelled'].includes(order.value.status))
const fillCustomerForm=()=>{if(!order.value)return;customerForm.name=order.value.name||'';customerForm.email=order.value.email||'';customerForm.phone=order.value.phone||'';customerForm.delivery_method=order.value.delivery_method||'seller_courier';customerForm.address=order.value.delivery_method==='pickup'?'':order.value.address||'';customerForm.postal_code=order.value.postal_code||'';customerForm.delivery_price=order.value.delivery_price_confirmed===true?String(Number(order.value.delivery_price||0)):'';customerForm.comment=order.value.comment||''}
const loadOrder=async()=>{loading.value=true;errorMessage.value='';ordersStore.clearCurrentOrder();try{await ordersStore.fetchAdminOrder(orderId);adminNote.value=ordersStore.order?.admin_note||'';assignedManagerId.value=ordersStore.order?.assigned_manager_id?String(ordersStore.order.assigned_manager_id):'';fillCustomerForm();await Promise.allSettled([ordersStore.fetchOrderHistory(orderId),ordersStore.fetchOrderActivity(orderId),ordersStore.fetchStatusOptions(orderId),ordersStore.fetchManagers()])}catch(error){errorMessage.value=error?.data?.message||error?.response?._data?.message||'Проверьте авторизацию и повторите попытку.'}finally{loading.value=false}}
onMounted(loadOrder);onBeforeUnmount(()=>ordersStore.clearCurrentOrder())

const saveAssignment=async()=>{if(savingAssignment.value)return;savingAssignment.value=true;try{await ordersStore.assignOrder(orderId,assignedManagerId.value?Number(assignedManagerId.value):null);assignedManagerId.value=ordersStore.order?.assigned_manager_id?String(ordersStore.order.assigned_manager_id):'';await ordersStore.fetchOrderActivity(orderId);notifications.success('Ответственный сохранён')}catch(error){notifications.error(error?.data?.message||error?.response?._data?.message||'Не удалось назначить менеджера')}finally{savingAssignment.value=false}}
const claimOrder=async()=>{if(savingAssignment.value)return;savingAssignment.value=true;try{await ordersStore.assignOrder(orderId,auth.user.id);assignedManagerId.value=String(auth.user.id);await ordersStore.fetchOrderActivity(orderId);notifications.success('Заказ назначен на вас')}catch(error){notifications.error(error?.data?.message||error?.response?._data?.message||'Не удалось взять заказ')}finally{savingAssignment.value=false}}
const statusText=getOrderStatusLabel
const startCustomerEdit=()=>{fillCustomerForm();editingCustomer.value=true}
const cancelCustomerEdit=()=>{fillCustomerForm();editingCustomer.value=false}
const saveCustomer=async()=>{if(savingCustomer.value)return;savingCustomer.value=true;try{const payload={name:customerForm.name,email:customerForm.email,phone:customerForm.phone,delivery_method:customerForm.delivery_method,address:needsDeliveryDetails(customerForm.delivery_method)?customerForm.address:'Самовывоз',postal_code:usesPostalCode(customerForm.delivery_method)?customerForm.postal_code:'',delivery_price:customerForm.delivery_method==='pickup'?0:(customerForm.delivery_price===''?null:Number(customerForm.delivery_price)),comment:customerForm.comment};await ordersStore.updateAdminOrder(orderId,payload);fillCustomerForm();editingCustomer.value=false;notifications.success('Данные заказа сохранены')}catch(error){notifications.error(error?.data?.message||error?.response?._data?.message||'Не удалось сохранить данные заказа')}finally{savingCustomer.value=false}}
const saveAdminNote=async()=>{if(savingNote.value)return;savingNote.value=true;try{await ordersStore.updateAdminOrderNote(orderId,adminNote.value);adminNote.value=ordersStore.order?.admin_note||'';notifications.success('Внутренняя заметка сохранена')}catch(error){notifications.error(error?.data?.message||error?.response?._data?.message||'Не удалось сохранить заметку')}finally{savingNote.value=false}}
const activityTitle=item=>({
  'order.assign':'Изменён ответственный',
  'order.status':'Изменён статус',
  'order.update':'Изменены данные заказа',
  'order.customer_cancel':'Заказ отменён покупателем'
}[item.action]||'Действие с заказом')
const activityDescription=item=>{
  const d=item?.details||{}
  if(item.action==='order.assign'){
    const from=d.from_manager_email||'без ответственного'
    const to=d.to_manager_email||'без ответственного'
    return `${from} → ${to}`
  }
  if(item.action==='order.status') return `Новый статус: ${statusText(d.to_status||d.status)}`
  if(item.action==='order.customer_cancel') return 'Покупатель отменил заказ до начала обработки'
  if(item.action==='order.update') return 'Изменены контактные данные или внутренняя информация'
  return item.entity_label||''
}
const formatPrice=value=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number(value||0))
const formatDate=(value,withTime=false)=>value?new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'long',year:'numeric',...(withTime?{hour:'2-digit',minute:'2-digit'}:{})}).format(new Date(value)):'Дата не указана'
</script>

<style scoped lang="scss">
.order-detail{min-height:calc(100dvh - 124px);background:#f8f5ef}.order-detail__back{display:inline-flex;margin-bottom:18px;color:#765a3b;font-size:13px;font-weight:750}.order-state{display:flex;align-items:center;justify-content:center;gap:14px;min-height:170px;padding:24px}.order-state i{width:28px;height:28px;border:3px solid #e3d7c8;border-right-color:#795936;border-radius:50%;animation:ui-spin .7s linear infinite}.order-state p{margin:5px 0 0;color:#817568}.order-detail__head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:18px}.order-detail__head span{color:#896742;font-size:11px;font-weight:800;text-transform:uppercase}.order-detail__head h1{margin:3px 0;color:#342719;font-size:40px}.order-detail__head p{margin:0;color:#82766a}.order-detail__total{display:grid;grid-template-columns:auto auto;gap:4px 14px;text-align:right}.order-detail__total strong{font-size:25px}.order-detail__total em{grid-column:1/-1;justify-self:end;padding:6px 9px;border-radius:999px;background:#eee5d9;color:#765a3b;font-size:11px;font-style:normal;font-weight:800}.order-detail__layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(260px,.8fr);align-items:start;gap:14px}.order-detail main,.order-detail aside{display:grid;gap:14px}.order-block{padding:18px;border-radius:17px}.order-block h2{margin:0;padding-bottom:13px;border-bottom:1px solid rgba(111,82,48,.09);font-size:16px}.order-block__head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:13px;border-bottom:1px solid rgba(111,82,48,.09)}.order-block__head h2{padding:0;border:0}.order-block__head p{margin:6px 0 0;max-width:620px;font-size:12px;line-height:1.45}.customer-edit__button{flex:0 0 auto;min-height:38px;padding:8px 12px}.order-info{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:16px 0 0}.order-info dt{color:#948779;font-size:10px;font-weight:800;text-transform:uppercase}.order-info dd{margin:4px 0 0;overflow-wrap:anywhere}.order-info .wide{grid-column:1/-1}.customer-edit{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:16px}.customer-edit .field{position:relative;display:grid;gap:6px}.customer-edit .field>span{color:#948779;font-size:10px;font-weight:800;text-transform:uppercase}.customer-edit .field__input,.customer-edit .field__select,.customer-edit .field__textarea{width:100%;min-width:0}.customer-edit .field__textarea{resize:vertical}.customer-edit__wide{grid-column:1/-1}.customer-edit__actions{display:flex;justify-content:flex-end;gap:10px;padding-top:4px}.field-counter{justify-self:end;color:#918477}.order-products article{display:grid;grid-template-columns:50px minmax(0,1fr) auto;align-items:center;gap:11px;padding:12px 0;border-bottom:1px solid rgba(111,82,48,.08)}.order-products img,.order-products__photo{width:50px;height:50px;border-radius:10px;background:#eee5da;object-fit:cover}.order-products__photo{display:grid;place-items:center;color:#9a8b7b;font-size:9px}.order-products article div{display:grid;gap:4px;min-width:0}.order-products article div strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.order-products small,.order-history small,.order-activity small,.muted{color:#918477}.order-totals{display:grid;gap:10px;padding-top:16px}.order-totals__breakdown{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.order-totals__breakdown>div{display:grid;gap:5px;padding:11px 12px;border:1px solid rgba(111,82,48,.08);border-radius:12px;background:#faf6ef}.order-totals__breakdown span{color:#8d7f70;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}.order-totals__breakdown strong{color:#3d2e20;font-size:14px}.order-totals__discount{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 11px;border-radius:10px;background:#f1f6ef;color:#4d7255;font-size:11px;font-weight:700}.order-totals__grand{display:flex;align-items:end;justify-content:space-between;gap:16px;padding-top:11px;border-top:1px solid rgba(111,82,48,.11)}.order-totals__grand span{color:#675a4d;font-size:12px;font-weight:800}.order-totals__grand strong{color:#332619;font-size:20px;letter-spacing:-.02em}.order-totals__note{margin:0;padding:9px 11px;border-radius:10px;background:#fff7e8;color:#7d674b;font-size:11px;line-height:1.45}.order-history,.order-activity{display:grid;padding-top:14px}.order-history article,.order-activity article{display:grid;grid-template-columns:9px 1fr;gap:10px;padding-bottom:15px}.order-history article>i,.order-activity article>i{width:9px;height:9px;margin-top:4px;border-radius:50%;background:#80603d}.order-activity article>i{background:#52705a}.order-history article div,.order-activity article div{display:grid;gap:3px}.order-activity span{color:#66594d;font-size:11px;line-height:1.4}.order-detail aside :deep(.admin-order-status-manager){padding:18px;border-radius:17px}.assignment-block{display:grid;gap:12px}.assignment-block>p{margin:0;line-height:1.45}.assignment-grid{display:grid;gap:8px}.assignment-current{display:grid;gap:3px;padding:12px;border-radius:12px;background:#f1f6ef}.assignment-current--credit{background:#edf5ee}.assignment-current.is-empty{background:#f6f1ea}.assignment-current span{color:#8a7d70;font-size:10px;text-transform:uppercase}.assignment-current strong{overflow:hidden;text-overflow:ellipsis}.assignment-current small{color:#8f8275;font-size:10px}.admin-note{display:grid;gap:12px}.admin-note>p{margin:0;line-height:1.45}.admin-note__input{min-height:120px;padding:11px 12px;resize:vertical;line-height:1.45}.admin-note__actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.admin-note__actions small{color:#918477}.admin-note__actions .btn{min-height:40px}
@media(max-width:900px){.order-detail__layout{grid-template-columns:1fr}.order-detail aside{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.order-totals__breakdown{grid-template-columns:1fr}.order-detail__head{align-items:start;flex-direction:column}.order-detail__total{text-align:left}.order-detail__total em{justify-self:start}.order-info,.customer-edit{grid-template-columns:1fr}.order-info .wide,.customer-edit__wide{grid-column:auto}.order-block__head{align-items:stretch;flex-direction:column}.customer-edit__button{align-self:flex-start}.customer-edit__actions{flex-direction:column-reverse}.customer-edit__actions .btn{width:100%}.order-detail aside{grid-template-columns:1fr}}
</style>
