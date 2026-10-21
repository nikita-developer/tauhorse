export const defaultCatalogFilters = () => ({
  search: '',
  min_price: '',
  max_price: '',
  in_stock: false,
  on_sale: false,
  category_id: '',
  sort_by: 'catalog_position',
  sort_order: 'asc'
})

const allowedSort = new Set(['catalog_position', 'created_at', 'price', 'name'])
const allowedOrder = new Set(['asc', 'desc'])

const normalizePriceValue = value => {
  if (value === '' || value === null || value === undefined) return ''
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? String(value) : ''
}

export const getCatalogPriceRangeError = filters => {
  const min = filters?.min_price === '' || filters?.min_price == null ? null : Number(filters.min_price)
  const max = filters?.max_price === '' || filters?.max_price == null ? null : Number(filters.max_price)
  if (min === null || max === null || !Number.isFinite(min) || !Number.isFinite(max)) return ''
  return min > max ? 'Максимальная цена не может быть меньше минимальной.' : ''
}

export const normalizeCatalogPriceRange = filters => {
  const normalized = {...filters}
  const min = normalized.min_price === '' || normalized.min_price == null ? null : Number(normalized.min_price)
  const max = normalized.max_price === '' || normalized.max_price == null ? null : Number(normalized.max_price)
  if (min !== null && max !== null && Number.isFinite(min) && Number.isFinite(max) && min > max) {
    normalized.min_price = String(max)
    normalized.max_price = String(min)
  }
  return normalized
}

export const catalogFiltersFromQuery = query => normalizeCatalogPriceRange({
  search: typeof query?.search === 'string' ? query.search : '',
  min_price: normalizePriceValue(query?.min_price),
  max_price: normalizePriceValue(query?.max_price),
  in_stock: query?.in_stock === '1' || query?.in_stock === 'true' || query?.in_stock === true,
  on_sale: query?.on_sale === '1' || query?.on_sale === 'true' || query?.on_sale === true,
  category_id: typeof query?.category_id === 'string' || typeof query?.category_id === 'number' ? String(query.category_id) : '',
  sort_by: allowedSort.has(query?.sort_by) ? query.sort_by : 'catalog_position',
  sort_order: allowedOrder.has(query?.sort_order) ? query.sort_order : 'asc'
})

export const catalogFiltersToQuery = filters => {
  const query = {}
  if (filters.search) query.search = filters.search
  if (filters.min_price !== '' && filters.min_price != null) query.min_price = String(filters.min_price)
  if (filters.max_price !== '' && filters.max_price != null) query.max_price = String(filters.max_price)
  if (filters.in_stock) query.in_stock = '1'
  if (filters.on_sale) query.on_sale = '1'
  if (filters.category_id) query.category_id = String(filters.category_id)
  if (filters.sort_by && filters.sort_by !== 'catalog_position') query.sort_by = filters.sort_by
  if (filters.sort_order && filters.sort_order !== 'asc') query.sort_order = filters.sort_order
  return query
}
