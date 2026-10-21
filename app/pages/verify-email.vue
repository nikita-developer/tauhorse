<template>
  <section class="verify-page page-section">
    <div class="container verify-page__inner">
      <div class="card verify-card">
        <template v-if="token">
          <div v-if="state === 'loading'" class="verify-state">
            <span class="verify-spinner" aria-hidden="true"></span>
            <h1>Подтверждаем email</h1>
            <p>Это займёт несколько секунд.</p>
          </div>
          <div v-else-if="state === 'success'" class="verify-state">
            <span class="verify-icon is-success" aria-hidden="true">✓</span>
            <h1>Email подтверждён</h1>
            <p>{{ message }}</p>
            <NuxtLink to="/login" class="btn btn--primary">Войти в аккаунт</NuxtLink>
          </div>
          <div v-else class="verify-state">
            <span class="verify-icon is-error" aria-hidden="true">!</span>
            <h1>Ссылка не сработала</h1>
            <p>{{ message }}</p>
            <button class="btn btn--secondary" type="button" @click="clearToken">Отправить новую ссылку</button>
          </div>
        </template>

        <form v-else class="verify-resend" @submit.prevent="resend">
          <span class="verify-eyebrow">Подтверждение аккаунта</span>
          <h1>Получить новую ссылку</h1>
          <p>Укажите email, который использовали при регистрации.</p>
          <label class="field"><span>Email</span><input v-model="email" class="field__input" type="email" required autocomplete="email"></label>
          <button class="btn btn--primary" :disabled="resending">{{ resending ? 'Отправляем…' : 'Отправить ссылку' }}</button>
          <p v-if="message" class="verify-message">{{ message }}</p>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import {useAuthStore} from '~/stores/auth'
import {getApiErrorMessage} from '~/utils/api'

const route = useRoute()
const auth = useAuthStore()
const token = ref('')
const state = ref('loading')
const message = ref('')
const email = ref('')
const resending = ref(false)

const readToken = () => {
  const hash = window.location.hash.replace(/^#/, '')
  const params = new URLSearchParams(hash)
  token.value = params.get('token') || ''
  email.value = params.get('email') || ''
}

const verify = async () => {
  if (!token.value) return
  state.value = 'loading'
  try {
    const response = await auth.verifyEmail({token: token.value})
    state.value = 'success'
    message.value = response?.message || 'Email подтверждён.'
    history.replaceState(null, '', '/verify-email')
  } catch (error) {
    state.value = 'error'
    message.value = getApiErrorMessage(error) || 'Ссылка недействительна или истекла.'
  }
}

const clearToken = () => {
  token.value = ''
  message.value = ''
  history.replaceState(null, '', `/verify-email${email.value ? `#email=${encodeURIComponent(email.value)}` : ''}`)
}

const resend = async () => {
  if (resending.value) return
  resending.value = true
  message.value = ''
  try {
    const response = await auth.resendVerification({email: email.value})
    message.value = response?.message || 'Если аккаунт ожидает подтверждения, письмо отправлено.'
  } catch (error) {
    message.value = getApiErrorMessage(error) || 'Не удалось отправить письмо.'
  } finally {
    resending.value = false
  }
}

onMounted(async () => { readToken(); await verify() })
</script>

<style scoped lang="scss">
.verify-page{min-height:calc(100dvh - 150px);background:#faf7f1}.verify-page__inner{display:flex;justify-content:center}.verify-card{width:min(100%,520px);padding:30px;border-radius:24px}.verify-state,.verify-resend{display:grid;gap:15px;text-align:center}.verify-state{justify-items:center}.verify-state h1,.verify-resend h1{margin:0;color:#332619;font-size:32px;letter-spacing:-.035em}.verify-state p,.verify-resend p{margin:0;color:#766b60;line-height:1.6}.verify-icon{display:grid;place-items:center;width:58px;height:58px;border-radius:50%;font-size:27px;font-weight:800}.verify-icon.is-success{background:#e8f3ea;color:#39704a}.verify-icon.is-error{background:#f8e9e6;color:#a44f43}.verify-spinner{width:42px;height:42px;border:3px solid #e6dacb;border-right-color:#6f5230;border-radius:50%;animation:ui-spin .7s linear infinite}.verify-eyebrow{color:#8b6840;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.verify-resend{text-align:left}.verify-resend h1,.verify-resend>p{text-align:center}.verify-message{padding:11px 13px;border-radius:11px;background:#f2ece3;font-size:12px;text-align:center!important}
</style>
