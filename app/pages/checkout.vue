<template>
  <section class="page-section">
    <div class="container">
      <div class="checkout-page__head"><span>Последний шаг</span><h1>Оформление заказа</h1><p>Контакты и предпочтительный способ получения. После отправки Юлия свяжется с вами и подтвердит заказ.</p></div>
      <CheckoutForm />
    </div>
  </section>
</template>

<script setup>
import CheckoutForm from '~/components/order/CheckoutForm/CheckoutForm.vue'
</script>

<style scoped lang="scss">
.checkout-page__head { max-width: 900px; margin: 0 auto 22px; }
.checkout-page__head span { color: #87643d; font-size: 11px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
.checkout-page__head h1 { margin: 6px 0; color: #342719; font-size: clamp(30px,5vw,42px); letter-spacing: -.035em; }
.checkout-page__head p { margin: 0; color: #786e63; }
</style>
