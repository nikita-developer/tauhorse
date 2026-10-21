<template>
  <div class="error-page">
    <div class="error-page__card">
      <div class="error-page__code">{{ error?.statusCode === 404 ? '404' : 'Упс' }}</div>
      <span class="error-page__eyebrow">Кажется, тропа потерялась</span>
      <h1>{{ error?.statusCode === 404 ? 'Этой страницы нет в стойле' : 'Что-то пошло не по плану' }}</h1>
      <p>{{ error?.statusCode === 404 ? 'Зато каталог на месте — там можно продолжить выбирать корм и лакомства.' : 'Попробуйте вернуться в магазин. Если ошибка повторится, напишите нам.' }}</p>
      <div class="error-page__actions">
        <button class="btn btn--primary" type="button" @click="goHome">Вернуться в каталог</button>
        <button class="btn btn--secondary" type="button" @click="goBack">Назад</button>
      </div>
      <div class="error-page__trail" aria-hidden="true"><span>●</span><span>●</span><span>●</span><span>●</span></div>
    </div>
  </div>
</template>
<script setup>
defineProps({error: {type: Object, default: () => ({})}})
const goHome = () => clearError({redirect: '/'})
const goBack = () => { if (import.meta.client && history.length > 1) history.back(); else clearError({redirect: '/'}) }
</script>
<style scoped lang="scss">
.error-page { min-height: 100dvh; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at 50% 5%, rgba(169,125,72,.22), transparent 30%), #f6f0e7; }
.error-page__card { position: relative; width: min(720px, 100%); overflow: hidden; padding: clamp(32px, 7vw, 72px); border: 1px solid rgba(111,82,48,.13); border-radius: 32px; background: rgba(255,253,249,.94); box-shadow: 0 28px 70px rgba(52,35,18,.12); text-align: center; }
.error-page__code { position: absolute; top: -32px; right: -2px; color: rgba(121,89,54,.07); font-size: clamp(120px, 28vw, 230px); font-weight: 900; line-height: 1; }
.error-page__eyebrow { position: relative; color: #8b673f; font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.error-page h1 { position: relative; margin: 12px auto 16px; color: #312418; font-size: clamp(34px, 7vw, 58px); line-height: 1.04; letter-spacing: -.045em; }
.error-page p { position: relative; max-width: 520px; margin: 0 auto; color: #6e6459; font-size: 17px; line-height: 1.7; }
.error-page__actions { position: relative; display: flex; justify-content: center; gap: 10px; margin-top: 28px; }
.error-page__trail { display: flex; justify-content: center; gap: 20px; margin-top: 35px; color: #b89b79; transform: rotate(-5deg); }
.error-page__trail span:nth-child(even) { transform: translateY(7px); opacity: .55; }
@media (max-width: 520px) { .error-page__actions { display: grid; } }
</style>
