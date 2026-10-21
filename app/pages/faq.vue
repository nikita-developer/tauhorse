<template>
  <section class="info-page">
    <div class="container info-page__inner">
      <span class="info-page__eyebrow">Помощь</span>
      <h1>Вопросы и ответы</h1>

      <div class="info-page__faq">
        <article v-for="(item,index) in faqItems" :key="item.question" class="faq-item" :class="{'is-open':openIndex===index}">
          <button
            type="button"
            class="faq-item__trigger"
            :aria-expanded="openIndex===index"
            :aria-controls="`faq-answer-${index}`"
            @click="toggleFaq(index)"
          >
            <span>{{ item.question }}</span>
            <span class="faq-item__icon" aria-hidden="true"></span>
          </button>
          <div :id="`faq-answer-${index}`" class="faq-item__answer" :aria-hidden="openIndex!==index">
            <div><p>{{ item.answer }}</p></div>
          </div>
        </article>
      </div>

      <NuxtLink to="/contacts" class="btn btn--secondary">Задать свой вопрос</NuxtLink>
    </div>
  </section>
</template>

<script setup>
import {ref} from 'vue'

const faqItems=[
  {question:'Как подобрать корм?',answer:'Учитывайте массу, возраст, нагрузку, состояние зубов и основу текущего рациона. Новый продукт вводите постепенно.'},
  {question:'Как хранить корм?',answer:'В сухом прохладном месте, в закрытой таре, отдельно от химических средств. Ориентируйтесь на инструкцию производителя.'},
  {question:'Можно ли изменить заказ?',answer:'Свяжитесь с магазином как можно скорее. Возможность изменения зависит от текущего статуса заказа.'},
  {question:'Когда нужна консультация ветеринара?',answer:'При заболеваниях, восстановлении, беременности, резкой смене нагрузки и перед использованием лечебных рационов.'}
]

useSiteSeo({title:'Вопросы и ответы — TauHorse',description:'Ответы TauHorse о выборе и хранении кормов, изменении заказа и ситуациях, когда нужна консультация ветеринарного специалиста.'})
useHead(() => ({script:[{type:'application/ld+json',textContent:JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqItems.map(item=>({'@type':'Question',name:item.question,acceptedAnswer:{'@type':'Answer',text:item.answer}}))})}]}))

const openIndex=ref(0)
const toggleFaq=index=>{ openIndex.value=openIndex.value===index?null:index }
</script>
