<template>
  <section class="about-page">
    <div class="container about-page__inner">
      <header class="about-page__head">
        <span class="about-page__eyebrow">О магазине и бренде</span>
        <h1>TauHorse — магазин для тех, кто внимательно относится к рациону лошади</h1>
        <p>На главной странице оставлено только то, что помогает быстрее выбрать и купить. Здесь — история TauHorse, подход к ассортименту и Ворон, с которого началась сама идея.</p>
      </header>

      <section class="about-story">
        <div class="about-story__copy">
          <span>Как всё началось</span>
          <h2>Всё началось с Ворона. И его претензий к меню.</h2>
          <p>У меня есть конь Ворон. Он любит вкусно поесть, имеет собственное мнение почти по любому поводу и однажды решил, что кормушка — слишком важный вопрос, чтобы полностью доверять её человеку.</p>
          <blockquote>
            <span aria-hidden="true">“</span>
            <p>Я люблю вкусно поесть. А мой человек почему-то решил, что может составлять меню без согласования со мной. Пришлось брать кормушку под контроль. Теперь у него магазин, а у меня — должность.</p>
            <footer>Ворон · начальник по кормушке</footer>
          </blockquote>
          <p>Так появился TauHorse — место, где корма и лизунцы для лошадей можно спокойно сравнить и выбрать в одном каталоге. Ворон идею одобрил. Ассортимент, по его словам, всё ещё находится под строгим наблюдением.</p>
        </div>

        <figure class="about-story__portrait">
          <picture>
            <source media="(max-width: 760px)" srcset="/images/voron-720.webp">
            <img src="/images/voron.webp" width="1200" height="1789" loading="lazy" decoding="async" alt="Конь Ворон на лугу тянется к угощению">
          </picture>
          <figcaption><strong>Ворон</strong><span>начальник по кормушке · вдохновитель TauHorse</span></figcaption>
        </figure>
      </section>

      <section class="about-principles" aria-labelledby="about-principles-title">
        <div class="about-principles__head"><span>Как устроен магазин</span><h2 id="about-principles-title">Меньше лишнего — больше информации для выбора</h2></div>
        <div class="about-principles__grid">
          <article><i aria-hidden="true">01</i><strong>Карточка товара по делу</strong><p>Цена, наличие, фасовка, состав и рекомендации по кормлению находятся там, где их ожидаешь увидеть перед покупкой.</p></article>
          <article><i aria-hidden="true">02</i><strong>Каталог можно быстро сузить</strong><p>Категории, поиск, цена, наличие и сортировка помогают не листать всё подряд, если задача уже понятна.</p></article>
          <article><i aria-hidden="true">03</i><strong>Условия согласуем до оплаты</strong><p>После заявки свяжемся с покупателем, подтвердим наличие, подходящий способ получения и стоимость доставки.</p></article>
        </div>
      </section>

      <div class="about-page__actions">
        <NuxtLink to="/#catalog" class="btn btn--primary">Перейти к товарам</NuxtLink>
        <NuxtLink to="/contacts" class="btn btn--secondary">Контакты</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
useSiteSeo({
  title: 'О TauHorse — магазин кормов и лизунцов для лошадей',
  description: 'История TauHorse, подход к ассортименту кормов и лизунцов для лошадей и принципы работы магазина.'
})
</script>

<style scoped lang="scss">
.about-page{padding:48px 0 72px;background:radial-gradient(circle at 86% 4%,rgba(166,122,72,.12),transparent 24%),linear-gradient(180deg,#faf7f1,#f6f0e7)}.about-page__inner{max-width:1120px}.about-page__head{max-width:820px;margin-bottom:28px}.about-page__eyebrow,.about-story__copy>span,.about-principles__head>span{color:#8a663e;font-size:11px;font-weight:850;letter-spacing:.09em;text-transform:uppercase}.about-page__head h1{margin:10px 0 14px;color:#302317;font-size:clamp(38px,5.5vw,62px);line-height:1.02;letter-spacing:-.045em}.about-page__head p{max-width:760px;margin:0;color:#6a6055;font-size:17px;line-height:1.7}
.about-story{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(300px,.88fr);gap:22px;padding:24px;border:1px solid rgba(111,82,48,.11);border-radius:28px;background:rgba(255,255,255,.72);box-shadow:0 18px 44px rgba(66,44,21,.055)}.about-story__copy{display:grid;align-content:center;gap:15px;padding:8px}.about-story__copy h2{margin:0;color:#352719;font-size:34px;line-height:1.08;letter-spacing:-.035em}.about-story__copy>p{margin:0;color:#6d6256;font-size:14px;line-height:1.68}.about-story blockquote{position:relative;margin:2px 0;padding:17px 18px 16px 50px;border:1px solid rgba(111,82,48,.11);border-radius:17px;background:#f7f0e6}.about-story blockquote>span{position:absolute;left:16px;top:9px;color:#a47a4a;font-family:Georgia,serif;font-size:46px;line-height:1}.about-story blockquote p{margin:0;color:#413121;font-size:13px;font-weight:650;line-height:1.58}.about-story blockquote footer{margin-top:8px;color:#7c6246;font-size:11px;font-weight:800}.about-story__portrait{position:relative;min-height:520px;margin:0;overflow:hidden;border-radius:22px;background:#34261a}.about-story__portrait picture,.about-story__portrait img{display:block;width:100%;height:100%}.about-story__portrait picture{position:absolute;inset:0}.about-story__portrait img{object-fit:cover;object-position:50% 37%}.about-story__portrait::after{content:'';position:absolute;inset:45% 0 0;background:linear-gradient(180deg,transparent,rgba(31,21,12,.76))}.about-story__portrait figcaption{position:absolute;z-index:2;left:16px;right:16px;bottom:16px;display:grid;gap:3px;padding:13px 14px;border:1px solid rgba(255,255,255,.18);border-radius:15px;background:rgba(40,29,19,.6);backdrop-filter:blur(8px)}.about-story__portrait strong{color:#fff8ef;font-size:20px}.about-story__portrait span{color:#eadbc8;font-size:11px}
.about-principles{margin-top:28px}.about-principles__head{max-width:720px;margin-bottom:14px}.about-principles__head h2{margin:6px 0 0;color:#342619;font-size:30px;line-height:1.15}.about-principles__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.about-principles article{display:grid;gap:9px;padding:20px;border:1px solid rgba(111,82,48,.11);border-radius:18px;background:rgba(255,255,255,.74)}.about-principles i{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:#eee2d2;color:#755535;font-size:10px;font-style:normal;font-weight:900}.about-principles strong{color:#3b2d1e;font-size:15px}.about-principles p{margin:0;color:#74695d;font-size:12px;line-height:1.6}.about-page__actions{display:flex;gap:10px;margin-top:24px}.about-page__actions :deep(.btn){min-height:46px;padding:0 18px;border-radius:13px;text-decoration:none;font-weight:750}
@media(max-width:900px){.about-story{grid-template-columns:1fr}.about-story__portrait{min-height:430px}.about-principles__grid{grid-template-columns:1fr 1fr}.about-principles article:last-child{grid-column:1/-1}}
@media(max-width:620px){.about-page{padding:28px 0 48px}.about-page__head h1{font-size:38px}.about-page__head p{font-size:14px}.about-story{padding:15px;border-radius:22px}.about-story__copy{padding:3px}.about-story__copy h2{font-size:28px}.about-story__portrait{min-height:360px}.about-principles__grid{grid-template-columns:1fr}.about-principles article:last-child{grid-column:auto}.about-page__actions{display:grid;grid-template-columns:1fr}.about-page__actions :deep(.btn){width:100%}}
</style>
