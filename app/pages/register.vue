<template>
  <section class="page-section register-page">
    <div class="container auth-page">
      <div v-if="registration_done" class="card auth-form auth-form--success">
        <div class="register-success__icon" aria-hidden="true">✉</div>
        <span class="register-success__eyebrow">Остался один шаг</span>
        <h1>Подтвердите email</h1>
        <p>Мы отправили письмо на <strong>{{ registered_email }}</strong>. Перейдите по ссылке из письма, чтобы активировать аккаунт.</p>
        <p class="register-success__hint">Ссылка действует 24 часа. Без подтверждения войти в аккаунт нельзя.</p>
        <button class="btn btn--secondary" type="button" :disabled="resending" @click="resend">
          {{ resending ? 'Отправляем…' : 'Отправить письмо ещё раз' }}
        </button>
        <NuxtLink to="/login" class="btn btn--primary">Перейти ко входу</NuxtLink>
        <p v-if="resend_message" class="register-success__message">{{ resend_message }}</p>
      </div>

      <form v-else class="card auth-form" @submit.prevent="submitForm">
        <label class="bot-trap" aria-hidden="true" tabindex="-1">Сайт<input v-model="form_state.website" type="text" name="website" autocomplete="off" tabindex="-1" /></label>
        <span class="auth-form__eyebrow">Новый аккаунт</span>
        <h1>Регистрация</h1>

        <label class="field">
          <span>Email</span>
          <input v-model="form_state.email" class="field__input" type="email" autocomplete="email" required />
        </label>

        <label class="field">
          <span>Пароль</span>
          <input v-model="form_state.password" class="field__input" type="password" minlength="12" maxlength="128" autocomplete="new-password" required />
          <small>Минимум 12 символов, хотя бы одна буква и одна цифра.</small>
        </label>

        <p class="auth-form__note">После регистрации мы отправим ссылку подтверждения на email. Это защищает магазин от автоматических регистраций и ошибочных адресов.</p>
        <p class="auth-form__privacy">Для создания и работы аккаунта мы обрабатываем указанный email и технические данные. Подробнее — в <NuxtLink to="/legal/privacy">Политике обработки персональных данных</NuxtLink>. Рекламная рассылка при регистрации не включается.</p>
        <p v-if="auth_store.error_message" class="text-danger">{{ auth_store.error_message }}</p>

        <button class="btn btn--primary" :class="{'is-loading': auth_store.is_loading}" :disabled="auth_store.is_loading">{{ auth_store.is_loading ? 'Создаём…' : 'Создать аккаунт' }}</button>
        <p class="auth-form__login">Уже есть аккаунт? <NuxtLink to="/login">Войти</NuxtLink></p>
      </form>
    </div>
  </section>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import {getApiErrorMessage} from '~/utils/api'

const auth_store = useAuthStore()
const form_state = reactive({email: '', password: '', website: '', form_started_at: Date.now()})
const registration_done = ref(false)
const registered_email = ref('')
const resending = ref(false)
const resend_message = ref('')

const submitForm = async () => {
  try {
    await auth_store.register({...form_state})
    registered_email.value = form_state.email.trim().toLowerCase()
    registration_done.value = true
  } catch { /* message is already in store */ }
}

const resend = async () => {
  if (resending.value) return
  resending.value = true
  resend_message.value = ''
  try {
    const response = await auth_store.resendVerification({email: registered_email.value})
    resend_message.value = response?.message || 'Письмо отправлено повторно.'
  } catch (error) {
    resend_message.value = getApiErrorMessage(error) || 'Не удалось отправить письмо повторно.'
  } finally {
    resending.value = false
  }
}
</script>

<style scoped lang="scss">
.register-page{min-height:calc(100dvh - 150px);background:radial-gradient(circle at 80% 0,rgba(155,112,64,.1),transparent 26%),#faf7f1}
.auth-page{display:flex;justify-content:center}.auth-form{width:min(100%,500px);display:grid;gap:16px;padding:28px;border-radius:24px}.auth-form h1{margin:0;color:#332619;font-size:34px;letter-spacing:-.035em}.auth-form__eyebrow,.register-success__eyebrow{color:#8b6840;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.field small{color:#817568;font-size:12px;line-height:1.45}.auth-form__note{margin:0;padding:12px 14px;border-radius:12px;background:#f3ede4;color:#6e6255;font-size:12px;line-height:1.55}.auth-form__login{margin:0;color:#766a5e;font-size:13px;text-align:center}.auth-form__privacy{margin:0;color:#786d61;font-size:11px;line-height:1.55}.auth-form__privacy a{color:#6f5230;font-weight:800;text-decoration:underline}.auth-form__login a{color:#6f5230;font-weight:800;text-decoration:underline}.auth-form--success{text-align:center;justify-items:stretch}.register-success__icon{display:grid;place-items:center;width:54px;height:54px;margin:0 auto;border-radius:50%;background:#efe4d5;color:#6f5230;font-size:25px}.auth-form--success p{margin:0;color:#6f655a;line-height:1.6}.register-success__hint{padding:12px;border-radius:12px;background:#f7f2eb;font-size:12px}.register-success__message{color:#39704a!important;font-size:12px}
.bot-trap{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}
</style>
