<template>
  <section ref="filters_root" class="catalog-filters" :class="{'is-open': is_open}">
    <button
      class="catalog-filters__mobile-head"
      type="button"
      :aria-expanded="is_open"
      aria-controls="catalog-filter-panel"
      @click="toggleOpen"
    >
      <span class="catalog-filters__mobile-head-copy">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
        <span><strong>Фильтры и поиск</strong><small>{{ mobile_summary }}</small></span>
      </span>
      <span v-if="active_count" class="catalog-filters__count">{{ active_count }}</span>
      <span class="catalog-filters__chevron" aria-hidden="true"></span>
    </button>

    <button
      v-if="show_floating_trigger && !is_open"
      type="button"
      class="catalog-filters__floating-trigger"
      :class="{'has-active': active_count}"
      aria-label="Открыть фильтры каталога"
      @click="toggleOpen"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      <span>Фильтры</span>
      <b v-if="active_count">{{ active_count }}</b>
    </button>

    <button v-if="is_open" type="button" class="catalog-filters__backdrop" aria-label="Закрыть фильтры" @click="closeFilters"></button>

    <div id="catalog-filter-panel" class="catalog-filters__collapse">
      <div class="catalog-filters__collapse-inner" role="dialog" :aria-modal="is_open ? 'true' : undefined" aria-label="Фильтры каталога">
        <div class="catalog-filters__sheet-head">
          <div>
            <span>Каталог</span>
            <strong>Фильтры и поиск</strong>
          </div>
          <button class="catalog-filters__sheet-close" type="button" aria-label="Скрыть фильтры" @click="closeFilters">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            <span>Скрыть</span>
          </button>
        </div>

        <div class="catalog-filters__body">
          <div class="catalog-filters__heading">
            <div>
              <span>Подбор товаров</span>
              <strong>Найдите подходящий рацион</strong>
            </div>
            <span v-if="active_count" class="catalog-filters__active-badge">{{ active_count }}</span>
          </div>

          <label class="field field--search">
            <span class="field__label">Поиск по каталогу</span>
            <div class="field__control field__control--search">
              <svg class="field__search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg>
              <input v-model.trim="local_filters.search" class="field__input field__input--search" type="search" placeholder="Название, бренд, состав">
              <button v-if="local_filters.search" class="field__clear" type="button" aria-label="Очистить поиск" @click="local_filters.search = ''">×</button>
            </div>
          </label>

          <div v-if="props.categories.length" class="catalog-filters__section catalog-filters__category-section">
            <span class="catalog-filters__section-title">Категория</span>
            <AppSelect
              v-model="local_filters.category_id"
              :options="category_options"
              aria-label="Категория товаров"
            />
          </div>

          <div class="catalog-filters__section catalog-filters__price-section">
            <div class="catalog-filters__section-title-row">
              <span class="catalog-filters__section-title">Цена, ₽</span>
              <button v-if="local_filters.min_price || local_filters.max_price" class="catalog-filters__price-reset" type="button" @click="resetPrice">Сбросить</button>
            </div>

            <div class="catalog-filters__price-inputs">
              <label class="catalog-filters__price-field" :class="{'is-invalid': price_error}">
                <span>Минимум</span>
                <span class="catalog-filters__price-control">
                  <input
                    :value="local_filters.min_price"
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    placeholder="От"
                    aria-label="Минимальная цена"
                    :aria-invalid="Boolean(price_error)"
                    @input="updatePriceText('min_price', $event)"
                    @blur="normalizePriceField('min_price')"
                  >
                  <b>₽</b>
                </span>
              </label>
              <label class="catalog-filters__price-field" :class="{'is-invalid': price_error}">
                <span>Максимум</span>
                <span class="catalog-filters__price-control">
                  <input
                    :value="local_filters.max_price"
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    placeholder="До"
                    aria-label="Максимальная цена"
                    :aria-invalid="Boolean(price_error)"
                    @input="updatePriceText('max_price', $event)"
                    @blur="normalizePriceField('max_price')"
                  >
                  <b>₽</b>
                </span>
              </label>
            </div>

            <div v-if="has_price_range" class="catalog-filters__range" :style="price_slider_style" aria-label="Диапазон цены">
              <div class="catalog-filters__range-track" aria-hidden="true"><span></span></div>
              <input
                class="catalog-filters__range-input catalog-filters__range-input--min"
                :class="{'is-top': price_min_on_top}"
                type="range"
                :min="price_min_bound"
                :max="price_max_bound"
                :step="price_step"
                :value="price_slider_min"
                aria-label="Минимальная цена ползунком"
                @input="updatePriceRange('min', $event)"
              >
              <input
                class="catalog-filters__range-input catalog-filters__range-input--max"
                :class="{'is-top': price_max_on_top}"
                type="range"
                :min="price_min_bound"
                :max="price_max_bound"
                :step="price_step"
                :value="price_slider_max"
                aria-label="Максимальная цена ползунком"
                @input="updatePriceRange('max', $event)"
              >
              <div class="catalog-filters__range-limits" aria-hidden="true">
                <span>{{ formatPrice(price_min_bound) }}</span>
                <span>{{ formatPrice(price_max_bound) }}</span>
              </div>
            </div>
            <p v-if="price_error" class="catalog-filters__error" role="alert">{{ price_error }}</p>
          </div>

          <div class="catalog-filters__section">
            <span class="catalog-filters__section-title">Сортировка</span>
            <div class="catalog-filters__sort-row">
              <AppSelect
                v-model="local_filters.sort_by"
                :options="sort_options"
                aria-label="Критерий сортировки"
              />
              <button
                class="catalog-filters__order"
                :class="{'is-desc': local_filters.sort_order === 'desc'}"
                type="button"
                :title="sort_order_title"
                :aria-label="sort_order_title"
                :aria-pressed="local_filters.sort_order === 'desc' ? 'true' : 'false'"
                @click="toggleSortOrder"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14M5 8l3-3 3 3M16 19V5M13 16l3 3 3-3" />
                </svg>
              </button>
            </div>
            <small class="catalog-filters__sort-hint">{{ sort_order_hint }}</small>
          </div>

          <div class="catalog-filters__section catalog-filters__checks">
            <label class="catalog-filters__check">
              <input v-model="local_filters.in_stock" class="catalog-filters__checkbox" type="checkbox">
              <span class="catalog-filters__check-mark"></span>
              <span class="catalog-filters__check-copy"><strong>В наличии</strong><small>Скрыть товары, которых сейчас нет</small></span>
            </label>

            <label class="catalog-filters__check">
              <input v-model="local_filters.on_sale" class="catalog-filters__checkbox" type="checkbox">
              <span class="catalog-filters__check-mark"></span>
              <span class="catalog-filters__check-copy"><strong>Со скидкой</strong><small>Показывать только действующие акции</small></span>
            </label>
          </div>

          <div class="catalog-filters__footer">
            <span class="catalog-filters__status" role="status"><i v-if="is_loading"></i>{{ price_error ? 'Исправьте диапазон цен' : (is_loading ? 'Обновляем товары…' : 'Фильтры применяются автоматически') }}</span>
            <button class="catalog-filters__reset" type="button" :disabled="!has_active_filters" @click="resetFilters">Сбросить всё</button>
          </div>
        </div>

        <div class="catalog-filters__mobile-actions">
          <button type="button" class="catalog-filters__hide-results" aria-label="Скрыть фильтры" @click="closeFilters">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            <span>Скрыть</span>
          </button>
          <button type="button" class="catalog-filters__show-results" @click="closeFilters">Показать {{ props.result_count }} {{ productCountWord(props.result_count) }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import AppSelect from '~/components/ui/AppSelect.vue'
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import './catalog-filters.scss'
import {useCatalogFilters} from './useCatalogFilters'
import {catalogFiltersFromQuery} from '~/utils/catalog-filters'

const emit = defineEmits(['submit'])
const props = defineProps({
  is_loading: {type: Boolean, default: false},
  categories: {type: Array, default: () => []},
  result_count: {type: Number, default: 0},
  price_range: {type: Object, default: () => ({min: 0, max: 0})}
})
const route = useRoute()
const filters_root = ref(null)
const is_open = ref(false)
const show_floating_trigger = ref(false)
let locked_scroll_y = 0
let previous_body_styles = null

const closeFilters = () => { is_open.value = false }
const toggleOpen = () => { is_open.value = !is_open.value }

const lockBody = value => {
  if (!import.meta.client) return
  const body = document.body
  if (value) {
    if (previous_body_styles) return
    locked_scroll_y = window.scrollY
    previous_body_styles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow
    }
    body.style.position = 'fixed'
    body.style.top = `-${locked_scroll_y}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    return
  }
  if (!previous_body_styles) return
  Object.assign(body.style, previous_body_styles)
  previous_body_styles = null
  window.scrollTo(0, locked_scroll_y)
}

watch(is_open, value => lockBody(value))

const updateFloatingTrigger = () => {
  if (!import.meta.client || window.innerWidth > 960) { show_floating_trigger.value = false; return }
  const rect = filters_root.value?.getBoundingClientRect()
  show_floating_trigger.value = Boolean(rect && rect.bottom < 18)
}
const handleViewportChange = () => {
  if (import.meta.client && window.innerWidth > 960 && is_open.value) closeFilters()
  updateFloatingTrigger()
}
const handleScroll = () => updateFloatingTrigger()
const handleKeydown = event => { if (event.key === 'Escape' && is_open.value) closeFilters() }

onMounted(() => {
  window.addEventListener('resize', handleViewportChange, {passive: true})
  window.addEventListener('scroll', handleScroll, {passive: true})
  window.addEventListener('keydown', handleKeydown)
  updateFloatingTrigger()
})
onBeforeUnmount(() => {
  lockBody(false)
  if (!import.meta.client) return
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', handleKeydown)
})

const {local_filters, resetFilters, has_active_filters, active_count, setFilters, price_error} = useCatalogFilters(emit, catalogFiltersFromQuery(route.query))
watch(() => route.query, query => setFilters(catalogFiltersFromQuery(query)), {deep: true})

const category_options = computed(() => [
  {value: '', label: 'Все товары'},
  ...props.categories.map(category => ({
    value: String(category.id),
    label: `${category.name}${Number.isFinite(Number(category._count?.products)) ? ` · ${category._count.products}` : ''}`
  }))
])

const sort_options = [
  {value: 'catalog_position', label: 'Сначала рекомендуемые'},
  {value: 'price', label: 'По цене'},
  {value: 'name', label: 'По названию'},
  {value: 'created_at', label: 'По новизне'}
]

const toggleSortOrder = () => { local_filters.sort_order = local_filters.sort_order === 'asc' ? 'desc' : 'asc' }
const sort_order_title = computed(() => local_filters.sort_order === 'asc' ? 'Сейчас по возрастанию. Переключить на убывание' : 'Сейчас по убыванию. Переключить на возрастание')
const sort_order_hint = computed(() => {
  const mode = local_filters.sort_by
  const asc = local_filters.sort_order === 'asc'
  if (mode === 'price') return asc ? 'Сначала дешевле' : 'Сначала дороже'
  if (mode === 'name') return asc ? 'От А до Я' : 'От Я до А'
  if (mode === 'created_at') return asc ? 'Сначала старые' : 'Сначала новые'
  return asc ? 'В рекомендованном порядке' : 'В обратном порядке'
})

const price_min_bound = computed(() => Math.max(0, Math.floor(Number(props.price_range?.min) || 0)))
const price_max_bound = computed(() => {
  const raw = Math.ceil(Number(props.price_range?.max) || 0)
  return Math.max(price_min_bound.value, raw)
})
const has_price_range = computed(() => price_max_bound.value > price_min_bound.value)
const clampPrice = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0))
const price_min_candidate = computed(() => clampPrice(local_filters.min_price === '' ? price_min_bound.value : local_filters.min_price, price_min_bound.value, price_max_bound.value))
const price_max_candidate = computed(() => clampPrice(local_filters.max_price === '' ? price_max_bound.value : local_filters.max_price, price_min_bound.value, price_max_bound.value))
const price_slider_min = computed(() => Math.min(price_min_candidate.value, price_max_candidate.value))
const price_slider_max = computed(() => Math.max(price_min_candidate.value, price_max_candidate.value))
const price_slider_midpoint = computed(() => price_min_bound.value + (price_max_bound.value - price_min_bound.value) / 2)
// When both thumbs overlap, the thumb that can move away from the nearest edge must stay clickable.
// This also keeps the slider usable when a manually typed value lies outside the catalog's actual range.
const price_min_on_top = computed(() => price_slider_min.value >= price_slider_midpoint.value)
const price_max_on_top = computed(() => !price_min_on_top.value)
const price_step = 1
const price_slider_style = computed(() => {
  const span = Math.max(1, price_max_bound.value - price_min_bound.value)
  const from = ((price_slider_min.value - price_min_bound.value) / span) * 100
  const to = ((price_slider_max.value - price_min_bound.value) / span) * 100
  return {'--price-from': `${Math.max(0, Math.min(100, from))}%`, '--price-to': `${Math.max(0, Math.min(100, to))}%`}
})

const updatePriceText = (key, event) => {
  const cleaned = String(event.target.value || '').replace(/\D/g, '').slice(0, 9)
  local_filters[key] = cleaned
  if (event.target.value !== cleaned) event.target.value = cleaned
}
const normalizePriceField = key => {
  if (local_filters[key] === '') return
  const value = Math.max(0, Math.round(Number(local_filters[key]) || 0))
  local_filters[key] = String(value)
}
const updatePriceRange = (side, event) => {
  const raw = Number(event.target.value)
  if (side === 'min') {
    const value = Math.min(raw, price_slider_max.value)
    local_filters.min_price = value <= price_min_bound.value ? '' : String(Math.round(value))
  } else {
    const value = Math.max(raw, price_slider_min.value)
    local_filters.max_price = value >= price_max_bound.value ? '' : String(Math.round(value))
  }
  nextTick(() => { event.target.value = side === 'min' ? String(price_slider_min.value) : String(price_slider_max.value) })
}
const resetPrice = () => {
  local_filters.min_price = ''
  local_filters.max_price = ''
}
const formatPrice = value => `${new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 0}).format(Number(value || 0))} ₽`

const mobile_summary = computed(() => active_count.value ? `Выбрано фильтров: ${active_count.value}` : 'Категория, цена, наличие и сортировка')
const productCountWord = count => { const n=Math.abs(Number(count)||0)%100; const n1=n%10; if(n>10&&n<20)return 'товаров'; if(n1>1&&n1<5)return 'товара'; if(n1===1)return 'товар'; return 'товаров' }
</script>
