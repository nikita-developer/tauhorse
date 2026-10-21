<template>
  <form class="checkout-form card" @submit.prevent="submitOrder">
    <div class="checkout-form__section-head"><span>01</span><div><h2>Получатель</h2><p>Чтобы Юлия могла связаться с вами и подтвердить заказ</p></div></div>
    <div class="checkout-form__grid checkout-form__grid--customer">
      <label class="field"><span>Email</span><input v-model="form_state.email" class="field__input" type="email" autocomplete="email" required/></label>
      <label class="field"><span>Имя</span><input v-model="form_state.name" class="field__input" type="text" autocomplete="name" required/></label>
      <label class="field"><span>Телефон</span><input v-model="form_state.phone" class="field__input" type="tel" autocomplete="tel" required/></label>
    </div>

    <div class="checkout-form__section-head"><span>02</span><div><h2>Получение</h2><p>Выберите предпочтительный вариант — стоимость и срок подтвердим до оплаты</p></div></div>
    <div class="checkout-form__grid checkout-form__grid--delivery">
      <label class="field checkout-form__wide">
        <span>Как хотите получить заказ</span>
        <AppSelect v-model="form_state.delivery_method" :options="deliveryOptions" aria-label="Как получить заказ" />
      </label>

      <label v-if="form_state.delivery_method !== 'pickup'" class="field checkout-form__wide">
        <span>Адрес / город / пункт выдачи / пожелания *</span>
        <textarea v-model="form_state.address" class="field__textarea" autocomplete="street-address" required placeholder="Например: Москва, удобен ПВЗ рядом с метро …"></textarea>
      </label>

      <label v-if="['russian_post','seller_courier','courier'].includes(form_state.delivery_method)" class="field">
        <span>Почтовый индекс, если нужен</span>
        <input v-model="form_state.postal_code" class="field__input" inputmode="numeric" autocomplete="postal-code"/>
      </label>

      <div class="checkout-form__delivery-note checkout-form__wide">Стоимость доставки <strong>не добавляется автоматически</strong>. Менеджер подтвердит доступный способ, срок и тариф до оплаты заказа.</div>

      <label class="field checkout-form__wide"><span>Комментарий к заказу</span><textarea v-model="form_state.comment" class="field__textarea" maxlength="1000"></textarea></label>
    </div>

    <div class="checkout-form__finish">
      <label class="checkout-form__terms">
        <input v-model="form_state.terms_accepted" type="checkbox" required>
        <span>Я принимаю <NuxtLink to="/legal/terms" @click.stop>Публичную оферту</NuxtLink>.</span>
      </label>
      <p class="checkout-form__privacy-note">Данные из формы нужны для оформления и исполнения заказа. Подробнее — в <NuxtLink to="/legal/privacy">Политике обработки персональных данных</NuxtLink>. Согласие на рекламную рассылку в эту галочку не включено.</p>

      <p v-if="error_message" class="form-message form-message--error">{{ error_message }}</p>
      <div class="checkout-form__actions"><span>Проверьте контакты перед отправкой</span><button class="btn btn--primary checkout-form__submit" :class="{'is-loading': is_submitting}" :disabled="is_submitting">{{ is_submitting ? 'Отправляем…' : 'Отправить заказ' }}</button></div>
    </div>
  </form>
</template>

<script setup>
import AppSelect from '~/components/ui/AppSelect.vue'
import './checkout-form.scss'
import {useCheckoutForm} from './useCheckoutForm'
const {form_state, error_message, is_submitting, submitOrder} = useCheckoutForm()
const deliveryOptions=[{value:'seller_courier',label:'Доставка продавцом / курьером'},{value:'russian_post',label:'Почта России'},{value:'pickup_point',label:'Пункт выдачи / сервис доставки'},{value:'transport_company',label:'Транспортная компания'},{value:'pickup',label:'Самовывоз'},{value:'other',label:'Другой удобный способ'}]
</script>
