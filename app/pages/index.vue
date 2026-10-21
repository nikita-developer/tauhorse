<template>
  <section class="home-page">
    <div class="container">
      <div class="home-discount">
        <DiscountTiers :rules="discount_rules || []" />
      </div>

      <section id="catalog" ref="catalog_section" class="home-catalog">
        <div class="home-catalog__head">
          <div>
            <span class="home-catalog__label">Каталог</span>
            <h1 class="home-catalog__title">Товары для лошадей</h1>
            <p class="home-catalog__subtitle">Поиск, категория, цена, наличие и сортировка собраны в одном фильтре — выбирайте товар без лишних шагов.</p>
          </div>
          <div class="catalog-view-toggle" role="group" aria-label="Вид карточек на мобильном">
            <button type="button" :class="{active:catalog_view_mode==='two'}" :aria-pressed="catalog_view_mode==='two'" aria-label="Две карточки в ряд" @click="setCatalogView('two')"><i></i><i></i><i></i><i></i></button>
            <button type="button" :class="{active:catalog_view_mode==='one'}" :aria-pressed="catalog_view_mode==='one'" aria-label="Одна карточка в ряд" @click="setCatalogView('one')"><i></i><i></i></button>
          </div>
        </div>

        <div class="catalog-shell">
          <aside class="catalog-sidebar" aria-label="Фильтры каталога">
            <CatalogFilters
              :is_loading="show_catalog_loading"
              :categories="categories_store.items"
              :result_count="products_store.meta.total"
              :price_range="products_store.meta.price_range"
              @submit="applyFilters"
            />
          </aside>

          <div class="catalog-results">
            <div class="catalog-results__bar">
              <div>
                <span>{{ activeCategoryName }}</span>
                <strong>{{ products_store.meta.total }} {{ productCountWord(products_store.meta.total) }}</strong>
              </div>
              <button v-if="activeCategory" type="button" class="catalog-results__clear-category" @click="clearCategory">Сбросить категорию ×</button>
            </div>

            <div class="catalog-results__stage" :class="{'is-updating': show_catalog_loading}" :aria-busy="show_catalog_loading ? 'true' : 'false'">
              <div v-if="products_store.is_loading && !products_store.items.length" class="catalog-grid" :class="`is-${catalog_view_mode}`" aria-label="Загружаем товары">
                <div v-for="item in 6" :key="item" class="catalog-card-skeleton skeleton"></div>
              </div>

              <div v-else-if="products_store.items.length" class="catalog-grid" :class="`is-${catalog_view_mode}`" aria-live="polite">
                <ProductCard v-for="item in products_store.items" :key="item.id" :product="item" />
              </div>

              <div v-else class="catalog-empty"><h3>Товары не найдены</h3><p>Попробуйте изменить фильтры, цену или выбрать другую категорию.</p></div>

              <div v-if="show_catalog_loading && products_store.items.length" class="catalog-results__loading" role="status" aria-live="polite">
                <span aria-hidden="true"></span>
                <strong>Обновляем каталог</strong>
              </div>
            </div>

            <div v-if="products_store.meta.total > 0" class="catalog-pagination-slot">
              <div class="catalog-pagination" aria-label="Пагинация каталога">
                <span class="catalog-pagination__summary">{{ products_range }} из {{ products_store.meta.total }} товаров</span>
                <div class="catalog-pagination__controls">
                  <button class="catalog-pagination__arrow" :disabled="products_store.meta.page <= 1" aria-label="Предыдущая страница" @click="changePage(products_store.meta.page - 1)">←<span>Назад</span></button>
                  <button v-for="page in visible_pages" :key="page" class="catalog-pagination__page" :class="{'is-active': page === products_store.meta.page}" :aria-current="page === products_store.meta.page ? 'page' : undefined" @click="changePage(page)">{{ page }}</button>
                  <button class="catalog-pagination__arrow" :disabled="products_store.meta.page >= products_store.meta.total_pages" aria-label="Следующая страница" @click="changePage(products_store.meta.page + 1)"><span>Вперёд</span>→</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="home-trust" aria-label="Что получает покупатель">
        <article>
          <span aria-hidden="true">₽</span>
          <div><strong>Цена и наличие — сразу</strong><p>В каталоге видно, что можно заказать сейчас и сколько это стоит. Акционные цены отмечены отдельно.</p></div>
        </article>
        <article>
          <span aria-hidden="true">→</span>
          <div><strong>Доставка под ваш заказ</strong><p>Почта, ПВЗ, транспортная компания, самовывоз или другой удобный вариант — детали согласуем до оплаты.</p></div>
        </article>
        <article>
          <span aria-hidden="true">✓</span>
          <div><strong>Заказ остаётся под контролем</strong><p>После оформления можно открыть заказ и посмотреть его актуальный статус. Если нужен человек — контакты всегда внизу сайта.</p></div>
        </article>
      </section>
    </div>
  </section>
</template>

<script setup>
import {computed, onMounted, ref, watch} from 'vue'
import CatalogFilters from '~/components/catalog/CatalogFilters/CatalogFilters.vue'
import ProductCard from '~/components/catalog/ProductCard/ProductCard.vue'
import DiscountTiers from '~/components/catalog/DiscountTiers.vue'
import {useProductsStore} from '~/stores/products'
import {useCategoriesStore} from '~/stores/categories'
import {useDelayedPending} from '~/composables/useDelayedPending'
import {createApiUrl} from '~/utils/api'
import {catalogFiltersFromQuery,catalogFiltersToQuery} from '~/utils/catalog-filters'

const route = useRoute()
const router = useRouter()
const products_store = useProductsStore()
const categories_store = useCategoriesStore()
const catalog_section = ref(null)
const catalog_view_mode = ref('two')
const {is_visible: show_catalog_loading, start: startCatalogLoading, finish: finishCatalogLoading} = useDelayedPending({delay: 160, minimum: 240})

watch(() => products_store.is_loading, async value => { if (value) startCatalogLoading(); else await finishCatalogLoading() })
const visible_pages = computed(() => { const total=Number(products_store.meta.total_pages||1); const current=Number(products_store.meta.page||1); const start=Math.max(1,Math.min(current-2,total-4)); return Array.from({length:Math.min(5,total)},(_,index)=>start+index) })
const products_range = computed(() => { const total=Number(products_store.meta.total||0); if(!total)return '0'; const start=(products_store.meta.page-1)*products_store.meta.limit+1; const end=Math.min(total,products_store.meta.page*products_store.meta.limit); return start===end?`${start}`:`${start}–${end}` })
const activeCategory = computed(() => String(route.query.category_id || ''))
const activeCategoryName = computed(() => {
  if (!activeCategory.value) return 'Все категории'
  return categories_store.items.find(category => String(category.id) === activeCategory.value)?.name || 'Выбранная категория'
})

useSiteSeo({title:'TauHorse — корма и лизунцы для лошадей',description:'Корма и лизунцы для лошадей в TauHorse: актуальные цены и наличие, удобные фильтры, самовывоз и доставка по Москве, Московской области и России.'})
const site = useRuntimeConfig().public
useHead(() => ({script:[{type:'application/ld+json',textContent:JSON.stringify({
  '@context':'https://schema.org',
  '@type':'OnlineStore',
  name:site.shopName || 'TauHorse',
  url:String(site.appUrl || 'https://tauhorse.ru').replace(/\/$/,''),
  logo:`${String(site.appUrl || 'https://tauhorse.ru').replace(/\/$/,'')}/brand/tauhorse-logo.png`,
  email:site.shopEmail,
  telephone:site.shopPhone,
  address:{'@type':'PostalAddress',streetAddress:'ул. Ленинградская, д. 24',addressLocality:'Долгопрудный, Хлебниково',addressRegion:'Московская область',addressCountry:'RU'},
  sameAs:[site.socialMax,site.socialWhatsapp,site.socialAvito,site.relatedProjectUrl].filter(Boolean)
})}] }))
const requestFromRoute = () => ({...catalogFiltersFromQuery(route.query),page:Math.max(1,Number.parseInt(String(route.query.page||'1'),10)||1)})
const loadCatalog = () => products_store.fetchProducts(requestFromRoute(), {replace:true})
const applyFilters = async filters => router.replace({query:catalogFiltersToQuery(filters)})
const clearCategory = async () => { const filters=catalogFiltersFromQuery(route.query); filters.category_id=''; await applyFilters(filters) }
const setCatalogView = mode => { catalog_view_mode.value=mode; if(import.meta.client)localStorage.setItem('tauhorse:catalog-view',mode) }
const changePage = async page => { if(page===products_store.meta.page||page<1||page>products_store.meta.total_pages)return; const query={...catalogFiltersToQuery(catalogFiltersFromQuery(route.query)),...(page>1?{page:String(page)}:{})}; await router.replace({query}); if(import.meta.client){const reduce_motion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;catalog_section.value?.scrollIntoView({behavior:reduce_motion?'auto':'smooth',block:'start'})} }
const productCountWord = count => { const n=Math.abs(Number(count)||0)%100; const n1=n%10; if(n>10&&n<20)return 'товаров'; if(n1>1&&n1<5)return 'товара'; if(n1===1)return 'товар'; return 'товаров' }

const [{data: discount_rules}] = await Promise.all([
  useAsyncData('discount-rules-public', () => $fetch(createApiUrl('/discount-rules'))),
  useAsyncData('products', loadCatalog),
  useAsyncData('categories', () => categories_store.fetchCategories())
])

onMounted(() => { const saved=localStorage.getItem('tauhorse:catalog-view'); if(saved==='one'||saved==='two')catalog_view_mode.value=saved })
watch(() => route.fullPath, () => { if(route.path==='/')loadCatalog().catch(console.error) })
</script>

<style scoped lang="scss">
.home-page{padding:20px 0 54px;background:radial-gradient(circle at top left,rgba(170,130,82,.08),transparent 24%),linear-gradient(180deg,#f8f4ec 0%,#fcfbf8 34%,#f6f1e7 100%)}
.home-discount{margin-bottom:22px}.home-discount :deep(.discount-tiers){margin:0}
.home-catalog{scroll-margin-top:96px}.home-catalog__head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:14px;padding:4px 2px 0}.home-catalog__label{display:inline-block;margin-bottom:6px;color:#8a6a42;font-size:10px;font-weight:850;letter-spacing:.085em;text-transform:uppercase}.home-catalog__title{margin:0;color:#2f2418;font-size:clamp(30px,4vw,42px);line-height:1.02;letter-spacing:-.035em}.home-catalog__subtitle{max-width:720px;margin:7px 0 0;color:#6d675f;font-size:12px;line-height:1.55}
.catalog-view-toggle{display:none;align-items:center;gap:5px;padding:4px;border:1px solid rgba(111,82,48,.11);border-radius:12px;background:#fff}.catalog-view-toggle button{display:grid;grid-template-columns:repeat(2,5px);gap:2px;place-content:center;width:34px;height:30px;border:0;border-radius:8px;background:transparent;cursor:pointer}.catalog-view-toggle button:last-child{grid-template-columns:12px}.catalog-view-toggle i{display:block;width:5px;height:5px;border-radius:1px;background:#a39482}.catalog-view-toggle button:last-child i{width:12px}.catalog-view-toggle button.active{background:#75603f}.catalog-view-toggle button.active i{background:#fff}

.catalog-shell{display:grid;grid-template-columns:270px minmax(0,1fr);gap:20px;align-items:start;margin-top:16px}.catalog-sidebar{position:sticky;top:100px;min-width:0;max-height:calc(100dvh - 118px);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin}.catalog-results{display:flex;flex-direction:column;min-width:0;min-height:clamp(620px,calc(100svh - 135px),780px)}.catalog-results__bar{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;margin-bottom:10px;padding:0 3px}.catalog-results__bar>div{display:flex;align-items:baseline;gap:9px;min-width:0}.catalog-results__bar span{overflow:hidden;color:#887a6c;font-size:10px;font-weight:800;letter-spacing:.055em;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}.catalog-results__bar strong{color:#3b2d1f;font-size:12px;white-space:nowrap}.catalog-results__clear-category{flex:0 0 auto;padding:6px 9px;border:0;border-radius:9px;background:#f0e8de;color:#6c5439;font-size:10px;font-weight:750;cursor:pointer}
.catalog-results__stage{position:relative;min-height:0}.catalog-results__stage.is-updating .catalog-grid{opacity:.55;filter:saturate(.88)}.catalog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;transition:opacity .16s ease,filter .16s ease}.catalog-card-skeleton{min-height:420px;border-radius:24px}.catalog-empty{display:grid;gap:8px;justify-items:center;padding:50px 24px;border:1px dashed rgba(122,92,55,.24);border-radius:22px;background:rgba(255,255,255,.72);text-align:center}.catalog-empty h3,.catalog-empty p{margin:0}.catalog-empty p{color:#6d675f}.catalog-results__loading{position:absolute;z-index:3;inset:0;display:grid;place-content:center;justify-items:center;gap:8px;border-radius:22px;background:rgba(250,247,241,.34);backdrop-filter:blur(1.5px);color:#5f4932;pointer-events:none}.catalog-results__loading span{width:28px;height:28px;border:3px solid rgba(118,85,54,.18);border-right-color:#765536;border-radius:50%;animation:catalog-loading-spin .7s linear infinite}.catalog-results__loading strong{padding:5px 9px;border-radius:9px;background:rgba(255,253,249,.88);font-size:10px;box-shadow:0 5px 16px rgba(55,37,19,.06)}@keyframes catalog-loading-spin{to{transform:rotate(360deg)}}
.catalog-pagination-slot{margin-top:auto;padding-top:28px}.catalog-pagination{display:grid;grid-template-columns:1fr auto;align-items:center;gap:20px;padding:14px 16px;border:1px solid rgba(111,82,48,.1);border-radius:17px;background:rgba(255,255,255,.66)}.catalog-pagination__summary{color:#766b5f;font-size:12px}.catalog-pagination__controls{display:flex;align-items:center;gap:6px}.catalog-pagination__page,.catalog-pagination__arrow{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:38px;height:38px;padding:0 11px;border:1px solid rgba(111,82,48,.13);border-radius:11px;background:#fff;color:#4b3926;font-size:12px;font-weight:700;cursor:pointer}.catalog-pagination__page.is-active{border-color:#765534;background:#765534;color:#fff}.catalog-pagination__arrow:disabled{opacity:.35;cursor:not-allowed}

.home-trust{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:30px}.home-trust article{display:grid;grid-template-columns:auto 1fr;gap:12px;padding:18px;border:1px solid rgba(111,82,48,.09);border-radius:18px;background:rgba(255,255,255,.7)}.home-trust article>span{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:#eee3d4;color:#765737;font-size:12px;font-weight:900}.home-trust strong{display:block;margin-bottom:4px;color:#3e3022;font-size:14px}.home-trust p{margin:0;color:#786d61;font-size:11px;line-height:1.5}

@media(max-width:1180px){.catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:960px){.catalog-shell{grid-template-columns:1fr;gap:12px}.catalog-sidebar{position:static;max-height:none;overflow:visible}.catalog-results{min-height:clamp(520px,calc(100svh - 150px),700px)}.catalog-results__bar{margin-top:2px}}
@media(max-width:760px){.home-page{padding:14px 0 38px}.home-discount{margin-bottom:18px}.home-catalog__head{align-items:center}.home-catalog__title{font-size:30px}.home-catalog__subtitle{font-size:11px}.catalog-view-toggle{display:flex}.catalog-results{min-height:clamp(470px,calc(100svh - 145px),650px)}.catalog-results__bar{min-height:36px}.catalog-grid{gap:10px}.catalog-grid.is-two{grid-template-columns:repeat(2,minmax(0,1fr))}.catalog-grid.is-one{grid-template-columns:1fr}.catalog-pagination-slot{padding-top:20px}.catalog-pagination{grid-template-columns:1fr;justify-items:center;padding:12px 8px}.catalog-pagination__controls{width:100%;justify-content:center}.catalog-pagination__arrow span{display:none}.home-trust{grid-template-columns:1fr}.catalog-grid.is-two :deep(.product-card__body){padding:10px}.catalog-grid.is-two :deep(.product-card__title){font-size:13px;line-height:1.2}.catalog-grid.is-two :deep(.product-card__description){display:none}.catalog-grid.is-two :deep(.product-card__bottom){gap:6px;margin-top:10px;padding-top:9px}.catalog-grid.is-two :deep(.product-card__price){font-size:17px}.catalog-grid.is-two :deep(.product-card__button){min-width:0;height:36px;padding:0 8px;font-size:10px}.catalog-grid.is-two :deep(.product-card__quantity){grid-template-columns:30px 30px 30px;height:36px}}
@media(max-width:390px){.catalog-grid.is-two{gap:8px}.catalog-grid.is-two :deep(.product-card__price){font-size:15px}.catalog-grid.is-two :deep(.product-card__button){font-size:9px}.catalog-results__bar>div{display:grid;gap:1px}.catalog-results__clear-category{font-size:9px}}
@media(prefers-reduced-motion:reduce){.catalog-grid{transition:none}.catalog-results__loading span{animation:none}}
</style>
