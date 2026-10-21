<template>
  <section class="page-section auth-recovery">
    <div class="container auth-page">
      <form class="card auth-form" @submit.prevent="submitForm">
        <span class="auth-form__eyebrow">Безопасность аккаунта</span>
        <h1>Восстановление пароля</h1>
        <p class="auth-form__lead">Укажите email аккаунта. Если он зарегистрирован, мы отправим ссылку для создания нового пароля. Ссылка действует 15 минут.</p>

        <label class="field">
          <span>Email</span>
          <input v-model.trim="email" class="field__input" type="email" autocomplete="email" required />
        </label>

        <p v-if="success_message" class="auth-form__message is-success">{{ success_message }}</p>
        <p v-if="error_message" class="auth-form__message is-error">{{ error_message }}</p>

        <button class="btn btn--primary" :disabled="is_sending" :class="{'is-loading': is_sending}">
          {{ is_sending ? 'Отправляем…' : 'Отправить ссылку' }}
        </button>
        <NuxtLink to="/login" class="auth-form__back">Вернуться ко входу</NuxtLink>
      </form>
    </div>
  </section>
</template>

<script setup>
import {ref} from 'vue'
import {useAuthStore} from '~/stores/auth'
import {getApiErrorMessage} from '~/utils/api'

const auth_store = useAuthStore()
const email = ref('')
const success_message = ref('')
const error_message = ref('')
const is_sending = ref(false)

const submitForm = async () => {
  success_message.value = ''
  error_message.value = ''
  is_sending.value = true
  try {
    await auth_store.forgotPassword({email: email.value})
    success_message.value = 'Если аккаунт существует, письмо со ссылкой уже отправлено.'
  } catch (error) {
    error_message.value = getApiErrorMessage(error)
  } finally {
    is_sending.value = false
  }
}
</script>

<style scoped lang="scss">
.auth-recovery { background:radial-gradient(circle at 15% 10%, rgba(170,130,82,.1), transparent 24%), #faf7f1; }
.auth-page { display:flex; justify-content:center; }
.auth-form { width:min(100%,520px); display:grid; gap:16px; padding:30px; border-radius:24px; }
.auth-form h1 { margin:0; color:#2f2418; font-size:34px; line-height:1.08; }
.auth-form__eyebrow { color:#8a6a42; font-size:12px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; }
.auth-form__lead { margin:0 0 4px; color:#71675c; line-height:1.6; }
.auth-form__message { margin:0; padding:12px 14px; border-radius:12px; font-size:14px; }
.auth-form__message.is-success { background:#eff8f2; color:#2f7a52; }
.auth-form__message.is-error { background:#fcf1ef; color:#a74e43; }
.auth-form__back { justify-self:center; color:#6f5230; font-weight:700; text-decoration:underline; text-underline-offset:3px; }
</style>
