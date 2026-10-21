<template>
  <section class="page-section">
    <div class="container card legal-page contacts-page">
      <h1>Контакты</h1>
      <p><strong>TauHorse</strong> — корма и лизунцы для лошадей.</p>

      <div class="contacts-page__grid">
        <section>
          <h2>Связаться</h2>
          <p>
            <template v-if="shop.contactPerson"><strong>По вопросам заказов:</strong> {{ shop.contactPerson }}<br></template>
            <template v-if="shop.shopEmail">Email: <a :href="`mailto:${shop.shopEmail}`">{{ shop.shopEmail }}</a><br></template>
            <template v-if="shop.shopPhone">Телефон: <a :href="`tel:${shop.shopPhone}`">{{ shop.shopPhoneDisplay || shop.shopPhone }}</a></template>
          </p>
          <div class="contacts-page__social">
            <a v-if="shop.socialMax" :href="shop.socialMax" target="_blank" rel="noopener noreferrer">MAX ↗</a>
            <a v-if="shop.socialWhatsapp" :href="shop.socialWhatsapp" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
            <a v-if="shop.socialAvito" :href="shop.socialAvito" target="_blank" rel="noopener noreferrer">Avito ↗</a>
            <span>Telegram привязан к номеру {{ shop.shopPhoneDisplay || shop.shopPhone }}</span>
          </div>
        </section>

        <section>
          <h2>Самовывоз</h2>
          <p v-if="shop.shopAddress">{{ shop.shopAddress }}</p>
          <p>Самовывоз работает <strong>по предварительному согласованию</strong>. После оформления заказа договоримся о дате и времени выдачи.</p>
        </section>
      </div>

      <p v-if="shop.sellerName || shop.sellerOgrnip || shop.sellerInn">
        <template v-if="shop.sellerName">Продавец: {{ shop.sellerName }}<br></template>
        <template v-if="shop.sellerOgrnip">ОГРНИП: {{ shop.sellerOgrnip }}<br></template>
        <template v-if="shop.sellerInn">ИНН: {{ shop.sellerInn }}</template>
      </p>

      <p v-if="shop.sellerLegalAddress || shop.claimsEmail">
        <template v-if="shop.sellerLegalAddress">Адрес для обращений и возвратов: {{ shop.sellerLegalAddress }}<br></template>
        <template v-if="shop.claimsEmail">Email для претензий: <a :href="`mailto:${shop.claimsEmail}`">{{ shop.claimsEmail }}</a></template>
      </p>

      <p><NuxtLink to="/legal/requisites">Реквизиты продавца →</NuxtLink></p>
      <p v-if="shop.relatedProjectUrl"><a :href="shop.relatedProjectUrl" target="_blank" rel="noopener noreferrer">Связанный проект: «Конфета Ворона» — лизунцы для лошадей ↗</a></p>
      <p>По вопросам подбора лечебных рационов обратитесь к ветеринарному специалисту.</p>
    </div>
  </section>
</template>

<script setup>
const shop = useRuntimeConfig().public
useSiteSeo({
  title: 'Контакты TauHorse — телефон, email и самовывоз',
  description: 'Контакты TauHorse: +7 901 352-05-34, zoloto666@inbox.ru. Самовывоз в Долгопрудном по предварительному согласованию.'
})
</script>

<style scoped>
.contacts-page__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:24px 0}.contacts-page__grid section{padding:18px;border:1px solid rgba(111,82,48,.1);border-radius:16px;background:#fbf8f3}.contacts-page__grid h2{margin:0 0 10px;font-size:18px}.contacts-page__grid p{margin:0;color:#62584d;line-height:1.65}.contacts-page__social{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.contacts-page__social a,.contacts-page__social span{display:inline-flex;align-items:center;min-height:34px;padding:0 10px;border:1px solid rgba(111,82,48,.12);border-radius:10px;background:#fff;color:#6f5230;font-size:12px;font-weight:700}@media(max-width:700px){.contacts-page__grid{grid-template-columns:1fr}}
</style>
