<template>
  <Transition name="cookie-notice">
    <aside v-if="visible" class="cookie-notice" aria-label="Уведомление об использовании cookie">
      <div>
        <strong>Сайт использует необходимые cookie</strong>
        <p>Они нужны для входа, корзины и безопасности. Сторонняя рекламная аналитика не используется.</p>
      </div>
      <div class="cookie-notice__actions">
        <NuxtLink to="/legal/cookies">Подробнее</NuxtLink>
        <button type="button" @click="dismiss">Понятно</button>
      </div>
    </aside>
  </Transition>
</template>
<script setup>
import {onMounted, ref} from 'vue'
import './cookie-notice.scss'
const STORAGE_KEY='tauhorse:cookie-notice:v1'
const visible=ref(false)
onMounted(()=>{ try { visible.value=localStorage.getItem(STORAGE_KEY)!=='dismissed' } catch { visible.value=true } })
const dismiss=()=>{ visible.value=false; try { localStorage.setItem(STORAGE_KEY,'dismissed') } catch {} }
</script>
