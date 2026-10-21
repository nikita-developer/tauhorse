<template>
  <section class="campaigns-page page-section">
    <div class="container campaigns-page__inner">
      <header class="campaigns-head">
        <div>
          <span class="campaigns-head__eyebrow">Маркетинг</span>
          <h1 class="page-title">Email-рассылки</h1>
          <p>Создавайте простые письма в стиле магазина. Рассылка уходит только пользователям, которые сами включили «Акции и новости».</p>
        </div>
      </header>

      <div class="campaigns-layout">
        <form class="card campaign-editor" @submit.prevent="createCampaign">
          <div class="campaign-editor__head">
            <div>
              <span>Новая кампания</span>
              <h2>Подготовить письмо</h2>
            </div>
            <span class="campaign-editor__badge">Черновик</span>
          </div>

          <label class="field">
            <span class="field__label">Тема письма</span>
            <input v-model="form.subject" class="field__input" maxlength="160" placeholder="Например: Скидка 15% на Mash Energy до воскресенья" required>
            <small>Короткая тема лучше читается на телефоне. До 160 символов.</small>
          </label>

          <label class="field">
            <span class="field__label">Текст письма</span>
            <textarea v-model="form.body" class="field__textarea campaign-editor__textarea" rows="10" maxlength="8000" placeholder="Расскажите, что за акция, до какого числа она действует и кому подойдёт товар." required></textarea>
            <small>Шапка, кнопка «Посмотреть товары со скидкой» и оформление магазина добавятся автоматически.</small>
          </label>

          <div class="campaign-preview-note">
            <strong>Что увидит покупатель</strong>
            <p>Аккуратное письмо с логотипом/названием магазина, вашим текстом, кнопкой перехода в каталог и ссылкой управления подпиской.</p>
          </div>

          <button class="btn btn--primary" :class="{'is-loading': saving}" :disabled="saving" type="submit">
            {{ saving ? 'Сохраняем…' : 'Сохранить черновик' }}
          </button>
        </form>

        <section class="card campaign-list">
          <div class="campaign-list__head">
            <div><span>История</span><h2>Рассылки</h2></div>
            <strong>{{ items.length }}</strong>
          </div>

          <div v-if="!items.length" class="campaign-empty">
            <h3>Рассылок пока нет</h3>
            <p>Создайте первую кампанию — она останется черновиком, пока вы явно не нажмёте «Отправить».</p>
          </div>

          <article v-for="c in items" :key="c.id" class="campaign-item">
            <div class="campaign-item__top">
              <span class="campaign-status" :class="`is-${c.status}`">{{ c.status === 'sent' ? 'Отправлено' : 'Черновик' }}</span>
              <small v-if="c.status === 'sent'">{{ c.sent_count }} доставлено · {{ c.failed_count }} ошибок</small>
            </div>
            <h3>{{ c.subject }}</h3>
            <p>{{ c.body }}</p>
            <button v-if="c.status !== 'sent'" class="btn btn--secondary" type="button" @click="sendCampaign(c)">Отправить подписчикам</button>
          </article>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup>
definePageMeta({layout:'admin',middleware:'staff'})
import {reactive,ref} from 'vue'
import {useAuthStore} from '~/stores/auth'
import {useNotificationsStore} from '~/stores/notifications'

const auth=useAuthStore()
const notifications=useNotificationsStore()
const items=ref([])
const saving=ref(false)
const form=reactive({subject:'',body:''})
const load=async()=>{ items.value=await auth.authFetch('/api/campaigns/admin') }
const createCampaign=async()=>{
  saving.value=true
  try{
    await auth.authFetch('/api/campaigns/admin',{method:'POST',body:{subject:form.subject.trim(),body:form.body.trim()}})
    form.subject=''; form.body=''
    notifications.success('Черновик рассылки сохранён')
    await load()
  }catch(error){ notifications.error(error?.data?.message || 'Не удалось сохранить рассылку') }
  finally{ saving.value=false }
}
const sendCampaign=async c=>{
  if(!confirm(`Отправить «${c.subject}» всем подписчикам?`))return
  try{
    await auth.authFetch(`/api/campaigns/admin/${c.id}/send`,{method:'POST'})
    notifications.success('Рассылка отправлена')
    await load()
  }catch(error){ notifications.error(error?.data?.message || 'Не удалось отправить рассылку') }
}
await useAsyncData('campaigns',load)
</script>

<style scoped lang="scss">
.campaigns-page{min-height:calc(100dvh - 124px);background:#f8f5ef}.campaigns-page__inner{max-width:1180px}.campaigns-head{margin-bottom:24px}.campaigns-head__eyebrow,.campaign-editor__head span:first-child,.campaign-list__head span{color:#8a6a42;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.campaigns-head .page-title{margin:6px 0 8px}.campaigns-head p{max-width:760px;margin:0;color:#74695e;line-height:1.6}.campaigns-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.82fr);gap:20px;align-items:start}.campaign-editor,.campaign-list{padding:24px;border-radius:22px}.campaign-editor{display:grid;gap:18px}.campaign-editor__head,.campaign-list__head,.campaign-item__top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.campaign-editor__head h2,.campaign-list__head h2{margin:4px 0 0;color:#352719;font-size:22px}.campaign-editor__badge{padding:7px 10px;border-radius:999px;background:#f1e8dc;color:#775a39!important;font-size:10px!important}.field small{color:#8a7e71;line-height:1.45}.campaign-editor__textarea{min-height:210px}.campaign-preview-note{padding:15px 16px;border:1px solid rgba(111,82,48,.1);border-radius:15px;background:#faf6ef}.campaign-preview-note strong{color:#493724}.campaign-preview-note p{margin:6px 0 0;color:#756a5e;font-size:13px;line-height:1.55}.campaign-list__head{padding-bottom:16px;border-bottom:1px solid rgba(111,82,48,.1)}.campaign-list__head>strong{display:grid;place-items:center;min-width:34px;height:34px;border-radius:50%;background:#ede4d8;color:#705537}.campaign-empty{padding:38px 8px;text-align:center}.campaign-empty h3{margin:0 0 8px}.campaign-empty p{margin:0;color:#7c7165;line-height:1.55}.campaign-item{padding:18px 0;border-bottom:1px solid rgba(111,82,48,.09)}.campaign-item:last-child{border-bottom:0}.campaign-item h3{margin:12px 0 8px;color:#382a1c;font-size:17px}.campaign-item p{display:-webkit-box;margin:0 0 14px;overflow:hidden;color:#776c61;font-size:13px;line-height:1.55;-webkit-line-clamp:4;-webkit-box-orient:vertical}.campaign-status{padding:6px 9px;border-radius:999px;background:#f2e9dc;color:#775a39;font-size:10px;font-weight:800;text-transform:uppercase}.campaign-status.is-sent{background:#e6f3e8;color:#397049}.campaign-item__top small{color:#918577}.campaign-item .btn{min-height:40px;padding:8px 13px;font-size:12px}@media(max-width:900px){.campaigns-layout{grid-template-columns:1fr}.campaigns-page__inner{max-width:760px}}@media(max-width:620px){.campaign-editor,.campaign-list{padding:18px}.campaigns-page{padding-top:24px}}
</style>
