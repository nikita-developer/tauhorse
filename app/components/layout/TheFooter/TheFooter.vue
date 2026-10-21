<template>
  <footer class="the-footer">
    <div class="container">
      <div class="the-footer__main">
        <div class="the-footer__brand">
          <NuxtLink to="/" class="the-footer__logo" aria-label="TauHorse — на главную">
            <img src="/brand/tauhorse-logo.webp" width="180" height="95" alt="" aria-hidden="true">
            <span>TauHorse</span>
          </NuxtLink>
          <p>Корма и лизунцы для лошадей. Подберём способ получения и согласуем детали заказа до оплаты.</p>
          <div class="the-footer__contact">
            <a v-if="shop.shopPhone" :href="`tel:${shop.shopPhone}`">{{ shop.shopPhoneDisplay || shop.shopPhone }}</a>
            <a v-if="shop.shopEmail" :href="`mailto:${shop.shopEmail}`">{{ shop.shopEmail }}</a>
            <span v-if="shop.contactPerson">По вопросам заказов: {{ shop.contactPerson }}</span>
          </div>
          <div class="the-footer__social" aria-label="Связаться с TauHorse">
            <a v-if="shop.socialMax" :href="shop.socialMax" target="_blank" rel="noopener noreferrer">MAX</a>
            <a v-if="shop.socialWhatsapp" :href="shop.socialWhatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a v-if="shop.socialAvito" :href="shop.socialAvito" target="_blank" rel="noopener noreferrer">Avito</a>
            <span>Telegram: {{ shop.shopPhoneDisplay || shop.shopPhone }}</span>
          </div>
        </div>

        <nav class="the-footer__column" aria-label="Покупателям">
          <strong>Покупателям</strong>
          <NuxtLink to="/">Каталог</NuxtLink>
          <NuxtLink to="/legal/delivery">Доставка и оплата</NuxtLink>
          <NuxtLink to="/faq">Вопросы и ответы</NuxtLink>
          <NuxtLink to="/contacts">Контакты</NuxtLink>
        </nav>

        <nav class="the-footer__column" aria-label="О магазине">
          <strong>О TauHorse</strong>
          <NuxtLink to="/about">О нас</NuxtLink>
          <NuxtLink to="/feeding-guide">Как подобрать корм</NuxtLink>
          <NuxtLink to="/legal/terms">Публичная оферта</NuxtLink>
          <NuxtLink to="/legal/returns">Возврат и претензии</NuxtLink>
          <NuxtLink to="/legal/privacy">Персональные данные</NuxtLink>
          <NuxtLink to="/legal/cookies">Cookie</NuxtLink>
          <NuxtLink to="/legal/requisites">Реквизиты</NuxtLink>
        </nav>

        <div class="the-footer__note">
          <strong>Важно знать</strong>
          <p>Новый корм вводите постепенно. Лечебный рацион согласуйте с ветеринарным специалистом.</p>
          <NuxtLink to="/feeding-guide">Читать памятку →</NuxtLink>
          <a v-if="shop.relatedProjectUrl" class="the-footer__related" :href="shop.relatedProjectUrl" target="_blank" rel="noopener noreferrer">Конфета Ворона — лизунцы ↗</a>
        </div>
      </div>

      <div class="the-footer__bottom">
        <span>© {{ new Date().getFullYear() }} TauHorse</span>
        <span v-if="shop.sellerName && shop.sellerOgrnip">Продавец: {{ shop.sellerName }} · ОГРНИП {{ shop.sellerOgrnip }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import './the-footer.scss'
const shop = useRuntimeConfig().public
</script>
