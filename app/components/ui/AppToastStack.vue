<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="toast">
        <div v-for="item in notifications.items" :key="item.id" class="toast" :class="`toast--${item.type}`" role="status">
          <span class="toast__icon" aria-hidden="true">{{ icons[item.type] }}</span>
          <span class="toast__message">{{ item.message }}</span>
          <button class="toast__close" type="button" aria-label="Закрыть уведомление" @click="notifications.dismiss(item.id)">×</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import {useNotificationsStore} from '~/stores/notifications'
const notifications = useNotificationsStore()
const icons = {success: '✓', error: '!', info: 'i'}
</script>

<style scoped lang="scss">
.toast-stack { position: fixed; z-index: 10020; right: 20px; bottom: 20px; display: grid; gap: 10px; width: min(390px, calc(100vw - 32px)); pointer-events: none; }
.toast { display: grid; grid-template-columns: 30px 1fr 28px; align-items: center; gap: 10px; padding: 13px 12px; border: 1px solid rgba(62,45,28,.12); border-radius: 16px; background: rgba(255,253,249,.96); color: #352719; box-shadow: 0 16px 40px rgba(45,31,17,.18); backdrop-filter: blur(14px); pointer-events: auto; }
.toast__icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #e8f5ec; color: #26704a; font-weight: 800; }
.toast--error .toast__icon { background: #fde9e6; color: #a94438; }
.toast--info .toast__icon { background: #eee7dc; color: #735334; }
.toast__message { font-size: 14px; font-weight: 650; line-height: 1.4; }
.toast__close { border: 0; background: transparent; color: #786f65; font-size: 22px; cursor: pointer; }
.toast-enter-active, .toast-leave-active { transition: opacity .25s ease, transform .25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(12px) scale(.97); }
@media (max-width: 560px) { .toast-stack { right: 16px; bottom: 16px; } }
</style>
