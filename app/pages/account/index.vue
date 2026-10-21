<template>
  <section class="account-page">
    <div class="container account-page__container">
      <header class="account-page__header">
        <div>
          <span class="account-page__eyebrow">Личный кабинет</span>
          <h1>Настройки аккаунта</h1>
          <p>Управляйте почтовыми уведомлениями и переходите к истории заказов.</p>
        </div>
        <NuxtLink to="/account/orders" class="btn btn--primary">Мои заказы</NuxtLink>
      </header>

      <div class="account-page__grid">
        <article class="account-card">
          <span class="account-card__label">Аккаунт</span>
          <h2>{{ auth_store.user?.email }}</h2>
          <p>Этот подтверждённый адрес используется для входа и служебных писем, включая восстановление пароля.</p>
        </article>

        <article class="account-card account-card--settings">
          <div class="account-card__setting-copy">
            <span class="account-card__label">Почтовые уведомления</span>
            <h2>Статусы заказов</h2>
            <p>Получать письмо, когда администратор меняет статус заказа: оплачен, собирается, отправлен, доставлен и другие.</p>
          </div>

          <label class="account-switch" :class="{'is-disabled': is_saving}">
            <input
              v-model="notifications_enabled"
              type="checkbox"
              :disabled="is_saving"
              @change="saveNotifications"
            >
            <span class="account-switch__track" aria-hidden="true"><span></span></span>
            <strong>{{ notifications_enabled ? 'Включены' : 'Отключены' }}</strong>
          </label>

          <p v-if="status_message" class="account-card__status" :class="{'is-error': has_error}">
            {{ status_message }}
          </p>
        </article>

        <article class="account-card account-card--settings">
          <div class="account-card__setting-copy"><span class="account-card__label">Маркетинг</span><h2>Акции и новости</h2><p>Выключено по умолчанию. Включая рассылку, вы отдельно соглашаетесь получать рекламные письма от магазина. <NuxtLink to="/legal/marketing-consent">Текст согласия</NuxtLink>.</p></div>
          <label class="account-switch"><input v-model="marketing_enabled" type="checkbox" :disabled="is_saving_marketing" @change="saveMarketing"><span class="account-switch__track" aria-hidden="true"><span></span></span><strong>{{ marketing_enabled ? 'Включены' : 'Отключены' }}</strong></label>
        </article>
      </div>

      <div class="account-page__note">
        <strong>Важно:</strong> подтверждение нового заказа и письма для восстановления пароля остаются включёнными — переключатель выше относится только к изменениям статуса заказа.
      </div>
    </div>
  </section>
</template>

<script setup>
definePageMeta({middleware: 'auth'})

import {ref, watch} from 'vue'
import {useAuthStore} from '~/stores/auth'
import {getApiErrorMessage} from '~/utils/api'

const auth_store = useAuthStore()
const notifications_enabled = ref(auth_store.user?.order_notifications_enabled !== false)
const marketing_enabled = ref(auth_store.user?.marketing_emails_enabled === true)
const is_saving_marketing = ref(false)
const is_saving = ref(false)
const status_message = ref('')
const has_error = ref(false)

watch(
  () => auth_store.user?.order_notifications_enabled,
  value => {
    if (typeof value === 'boolean') notifications_enabled.value = value
  },
  {immediate: true}
)

const saveMarketing = async () => {
  const value=marketing_enabled.value; is_saving_marketing.value=true
  try { await auth_store.updatePreferences({marketing_emails_enabled:value}); status_message.value=value?'Согласие на рекламную рассылку сохранено.':'Рекламная рассылка отключена.'; has_error.value=false }
  catch { marketing_enabled.value=!value; status_message.value='Не удалось изменить настройку рассылки.'; has_error.value=true }
  finally { is_saving_marketing.value=false }
}

const saveNotifications = async () => {
  const requested_value = notifications_enabled.value
  is_saving.value = true
  status_message.value = ''
  has_error.value = false

  try {
    await auth_store.updatePreferences({order_notifications_enabled: requested_value})
    status_message.value = requested_value
      ? 'Уведомления о статусах включены.'
      : 'Уведомления о статусах отключены.'
  } catch (error) {
    notifications_enabled.value = !requested_value
    has_error.value = true
    status_message.value = getApiErrorMessage(error)
  } finally {
    is_saving.value = false
  }
}
</script>

<style scoped lang="scss">
.account-page {
  padding: 44px 0 72px;
  background: radial-gradient(circle at 8% 4%, rgba(170, 130, 82, .12), transparent 24%), linear-gradient(180deg, #f8f4ec 0%, #fcfbf8 48%, #f6f1e8 100%);
}
.account-page__container { max-width: 1000px; }
.account-page__header { display:flex; align-items:end; justify-content:space-between; gap:24px; margin-bottom:28px; }
.account-page__eyebrow, .account-card__label { color:#8a6a42; font-size:12px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; }
.account-page__header h1 { margin:9px 0 8px; color:#2f2418; font-size:clamp(34px, 5vw, 48px); line-height:1.05; letter-spacing:-.035em; }
.account-page__header p { max-width:650px; margin:0; color:#6d675f; line-height:1.65; }
.account-page__grid { display:grid; grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr); gap:18px; }
.account-card { padding:26px; border:1px solid rgba(122,92,55,.12); border-radius:26px; background:rgba(255,253,249,.96); box-shadow:0 18px 36px rgba(44,31,18,.06); }
.account-card h2 { margin:9px 0 10px; color:#302317; font-size:22px; overflow-wrap:anywhere; }
.account-card p { margin:0; color:#71675c; line-height:1.65; }.account-card p a{color:#735536;font-weight:700}
.account-card--settings { display:grid; grid-template-columns:1fr auto; align-items:center; gap:22px; }
.account-card__setting-copy { min-width:0; }
.account-switch { display:grid; justify-items:center; gap:8px; color:#4d3923; cursor:pointer; user-select:none; }
.account-switch input { position:absolute; opacity:0; pointer-events:none; }
.account-switch__track { display:block; width:58px; height:32px; padding:3px; border-radius:999px; background:#d8d0c4; transition:background .18s ease; }
.account-switch__track span { display:block; width:26px; height:26px; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(40,29,18,.18); transition:transform .18s ease; }
.account-switch input:checked + .account-switch__track { background:#6f5230; }
.account-switch input:checked + .account-switch__track span { transform:translateX(26px); }
.account-switch input:focus-visible + .account-switch__track { outline:3px solid rgba(125,89,48,.35); outline-offset:3px; }
.account-switch.is-disabled { opacity:.62; cursor:wait; }
.account-card__status { grid-column:1/-1; padding-top:14px; border-top:1px solid rgba(111,82,48,.1); color:#2f7a52 !important; font-weight:700; }
.account-card__status.is-error { color:#b05548 !important; }
.account-page__note { margin-top:18px; padding:18px 20px; border:1px solid rgba(122,92,55,.1); border-radius:18px; background:rgba(245,239,229,.72); color:#6b6055; line-height:1.6; }
.account-page__note strong { color:#3d2d1d; }
@media (max-width:760px) {
  .account-page { padding-top:28px; }
  .account-page__header { align-items:stretch; flex-direction:column; }
  .account-page__header .btn { width:100%; }
  .account-page__grid { grid-template-columns:1fr; }
  .account-card--settings { grid-template-columns:1fr; }
  .account-switch { justify-items:start; grid-template-columns:auto 1fr; align-items:center; }
}
</style>
