import {computed, onBeforeUnmount, onMounted, reactive, watch} from 'vue'
import {defaultCatalogFilters, getCatalogPriceRangeError, normalizeCatalogPriceRange} from '~/utils/catalog-filters'

const STORAGE_KEY = 'tauhorse:catalog-filters:v2'
const hasNonDefault = filters => Object.entries(defaultCatalogFilters()).some(([key, value]) => String(filters?.[key] ?? value) !== String(value))

export const useCatalogFilters = (emit, initial_filters = {}) => {
  let saved_filters = {}
  if (import.meta.client) {
    try { saved_filters = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {} } catch { saved_filters = {} }
  }

  saved_filters = normalizeCatalogPriceRange({...defaultCatalogFilters(), ...saved_filters})
  const initial = hasNonDefault(initial_filters) ? initial_filters : {...saved_filters, ...initial_filters}
  const local_filters = reactive({...defaultCatalogFilters(), ...normalizeCatalogPriceRange(initial)})
  let debounce_timeout = null
  let is_syncing = false

  const price_error = computed(() => getCatalogPriceRangeError(local_filters))
  const submitFilters = () => {
    if (price_error.value) return
    emit('submit', {...local_filters, page: 1})
  }

  const persist = () => {
    if (!import.meta.client) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({...local_filters})) } catch {}
  }

  const setFilters = filters => {
    is_syncing = true
    clearTimeout(debounce_timeout)
    Object.assign(local_filters, {...defaultCatalogFilters(), ...normalizeCatalogPriceRange(filters)})
    persist()
    queueMicrotask(() => { is_syncing = false })
  }

  const resetFilters = () => {
    setFilters(defaultCatalogFilters())
    emit('submit', {...defaultCatalogFilters(), page: 1})
  }

  const has_active_filters = computed(() => Boolean(
    local_filters.search || local_filters.min_price || local_filters.max_price || local_filters.in_stock ||
    local_filters.on_sale || local_filters.category_id || local_filters.sort_by !== 'catalog_position' || local_filters.sort_order !== 'asc'
  ))
  const active_count = computed(() => [
    local_filters.search, local_filters.min_price, local_filters.max_price, local_filters.in_stock,
    local_filters.on_sale, local_filters.category_id, local_filters.sort_by !== 'catalog_position', local_filters.sort_order !== 'asc'
  ].filter(Boolean).length)

  watch(local_filters, () => {
    persist()
    if (is_syncing || price_error.value) return
    clearTimeout(debounce_timeout)
    debounce_timeout = setTimeout(submitFilters, 380)
  }, {deep: true})

  onMounted(() => {
    if (!hasNonDefault(initial_filters) && hasNonDefault(saved_filters)) emit('submit', {...local_filters, page: 1})
  })
  onBeforeUnmount(() => clearTimeout(debounce_timeout))

  return {local_filters, submitFilters, resetFilters, setFilters, has_active_filters, active_count, price_error}
}
