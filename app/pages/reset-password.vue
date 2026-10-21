<template>
  <section class="page-section auth-recovery">
    <div class="container auth-page">
      <form v-if="token" class="card auth-form" @submit.prevent="submitForm">
        <span class="auth-form__eyebrow">Безопасность аккаунта</span>
        <h1>Новый пароль</h1>
        <p class="auth-form__lead">Придумайте пароль от 12 символов: используйте хотя бы одну букву и одну цифру.</p>

        <label class="field">
          <span>Новый пароль</span>
          <input v-model="password" class="field__input" type="password" autocomplete="new-password" minlength="12" maxlength="128" required />
        </label>

        <p v-if="success_message" class="auth-form__message is-success">{{ success_message }}</p>
        <p v-if="error_message" class="auth-form__message is-error">{{ error_message }}</p>

        <button v-if="!success_message" class="btn btn--primary" :disabled="is_saving" :class="{'is-loading': is_saving}">
          {{ is_saving ? 'Сохраняем…' : 'Сохранить новый пароль' }}
        </button>
        <NuxtLink v-else to="/login" class="btn btn--primary">Войти с новым паролем</NuxtLink>
      </form>

      <div v-else class="card auth-form">
        <span class="auth-form__eyebrow">Ссылка недействительна</span>
        <h1>Нет токена восстановления</h1>
        <p class="auth-form__lead">Запросите новую ссылку — старые ссылки автоматически перестают действовать после нового запроса.</p>
        <NuxtLink to="/forgot-password" class="btn btn--primary">Запросить новую ссылку</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import {useAuthStore} from '~/stores/auth'
import {getApiErrorMessage} from '~/utils/api'

const route = useRoute()
const auth_store = useAuthStore()
const token = ref('')
const password = ref('')
const success_message = ref('')
const error_message = ref('')
const is_saving = ref(false)

onMounted(() => {
  if (!token.value && route.hash) {
    token.value = new URLSearchParams(route.hash.replace(/^#/, '')).get('token') || ''
  }
})

const submitForm = async () => {
  error_message.value = ''
  is_saving.value = true
  try {
    await auth_store.resetPassword({token: token.value, password: password.value})
    success_message.value = 'Пароль успешно изменён. Все прежние сессии завершены.'
    password.value = ''
  } catch (error) {
    error_message.value = getApiErrorMessage(error)
  } finally {
    is_saving.value = false
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
</style>
