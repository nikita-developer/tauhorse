<template>
  <section class="page-section">
    <div class="container auth-page">
      <form class="card auth-form" @submit.prevent="submitForm">
        <h1>Вход</h1>

        <label class="field">
          <span>Email</span>
          <input v-model="form_state.email" class="field__input" type="email" autocomplete="email" required />
        </label>

        <label class="field">
          <span>Пароль</span>
          <input v-model="form_state.password" class="field__input" type="password" autocomplete="current-password" required />
        </label>

        <p v-if="auth_store.error_message" class="text-danger">{{ auth_store.error_message }}</p>
        <NuxtLink v-if="needs_verification" :to="`/verify-email#email=${encodeURIComponent(form_state.email)}`" class="verify-link">Отправить ссылку подтверждения ещё раз</NuxtLink>

        <button class="btn btn--primary" :class="{'is-loading': auth_store.is_loading}" :disabled="auth_store.is_loading">{{ auth_store.is_loading ? 'Входим…' : 'Войти' }}</button>
        <NuxtLink to="/forgot-password">Забыли пароль?</NuxtLink>
      </form>
    </div>
  </section>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

const auth_store = useAuthStore()
const form_state = reactive({
  email: '',
  password: ''
})
const needs_verification = computed(() => auth_store.error_message.includes('подтвердите email'))

const submitForm = async () => {
  try {
    await auth_store.login({ ...form_state })
  } catch { return }

  if (['admin','manager'].includes(auth_store.user?.role)) {
    await navigateTo('/admin')
    return
  }

  await navigateTo('/')
}
</script>

<style scoped lang="scss">
.auth-page {
  display: flex;
  justify-content: center;
}

.auth-form {
  width: min(100%, 480px);
  display: grid;
  gap: 16px;
  padding: 24px;
}
.verify-link{margin-top:-8px;color:#6f5230;font-size:13px;font-weight:750;text-decoration:underline}
</style>
