<template>
  <section class="page-section"><article class="container card legal-page legal-document">
    <header class="legal-document__head"><span>Информация о продавце</span><h1>Реквизиты</h1></header>
    <dl class="legal-requisites">
      <div v-if="shop.sellerName"><dt>Продавец</dt><dd>{{ shop.sellerName }}</dd></div>
      <div v-if="shop.sellerOgrnip"><dt>ОГРНИП</dt><dd>{{ shop.sellerOgrnip }}</dd></div>
      <div v-if="shop.sellerInn"><dt>ИНН</dt><dd>{{ shop.sellerInn }}</dd></div>
      <div v-if="shop.sellerRegistrationAuthority"><dt>Регистрирующий орган</dt><dd>{{ shop.sellerRegistrationAuthority }}</dd></div>
      <div v-if="shop.sellerLegalAddress"><dt>Адрес для обращений и возвратов</dt><dd>{{ shop.sellerLegalAddress }}</dd></div>
      <div v-if="shop.shopAddress"><dt>Адрес самовывоза</dt><dd>{{ shop.shopAddress }}<br><small>Выдача по предварительному согласованию даты и времени.</small></dd></div>
      <div v-if="shop.contactPerson"><dt>Контакт по заказам</dt><dd>{{ shop.contactPerson }}</dd></div>
      <div v-if="shop.shopEmail"><dt>Email</dt><dd><a :href="`mailto:${shop.shopEmail}`">{{ shop.shopEmail }}</a></dd></div>
      <div v-if="shop.claimsEmail"><dt>Email для претензий</dt><dd><a :href="`mailto:${shop.claimsEmail}`">{{ shop.claimsEmail }}</a></dd></div>
      <div v-if="shop.shopPhone"><dt>Телефон</dt><dd><a :href="`tel:${shop.shopPhone}`">{{ shop.shopPhoneDisplay || shop.shopPhone }}</a></dd></div>
    </dl>
  </article></section>
</template>
<script setup>
const shop=useRuntimeConfig().public
useSiteSeo({title:`Реквизиты продавца — ${shop.shopName}`,description:'Реквизиты продавца TauHorse: ИП Туманова Елена Владимировна, ИНН, ОГРНИП и контакты.'})
</script>
