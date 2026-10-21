import prisma from '../config/prisma.js'
import {ApiError} from '../utils/api-error.js'
import {withPromotionPricing} from '../utils/promotion.js'
import {deleteStoredMedia} from '../utils/media-storage.js'
import {
  parseFiniteNumber,
  parseNonNegativeInteger,
  parsePositiveInteger,
  requireTrimmedString,
  roundMoney
} from '../utils/validation.js'

const allowed_sort_fields = ['catalog_position', 'created_at', 'price', 'name']
const allowed_sort_orders = ['asc', 'desc']

const normalizeOptionalString = (value, max_length = 2000) => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string') throw ApiError.badRequest('Некорректное текстовое поле')
  const normalized = value.trim()
  if (normalized.length > max_length) throw ApiError.badRequest('Текстовое поле слишком длинное')
  return normalized || null
}

const normalizeProductData = async (payload, {partial = false} = {}) => {
  const data = {}
  if (!partial || payload.name !== undefined) data.name = requireTrimmedString(payload.name, 'Название', {max_length: 200})
  if (!partial || payload.price !== undefined) {
    const price = parseFiniteNumber(payload.price, 'Цена')
    if (price <= 0 || roundMoney(price) !== price) throw ApiError.badRequest('Цена должна быть положительной и содержать не более двух знаков после запятой')
    data.price = price
  }
  if (!partial || payload.stock !== undefined) data.stock = parseNonNegativeInteger(payload.stock ?? 0, 'stock')
  if (!partial || payload.catalog_position !== undefined) {
    data.catalog_position = parsePositiveInteger(payload.catalog_position ?? 1000, 'Позиция в каталоге')
    if (data.catalog_position > 9999) throw ApiError.badRequest('Позиция в каталоге должна быть от 1 до 9999')
  }
  if (!partial || payload.sale_percent !== undefined) {
    const percent = parseFiniteNumber(payload.sale_percent ?? 0, 'Скидка')
    if (!Number.isInteger(percent) || percent < 0 || percent > 70) throw ApiError.badRequest('Скидка на товар должна быть целым числом от 0 до 70%')
    data.sale_percent = percent
  }
  if (!partial || payload.is_featured !== undefined) data.is_featured = payload.is_featured === true
  if (!partial || payload.promo_label !== undefined) data.promo_label = normalizeOptionalString(payload.promo_label, 60)
  for (const field of ['sale_starts_at', 'sale_ends_at']) {
    if (!partial || payload[field] !== undefined) {
      if (!payload[field]) data[field] = null
      else { const date = new Date(payload[field]); if (Number.isNaN(date.getTime())) throw ApiError.badRequest('Некорректная дата акции'); data[field] = date }
    }
  }
  if (data.sale_starts_at && data.sale_ends_at && data.sale_starts_at >= data.sale_ends_at) throw ApiError.badRequest('Дата окончания акции должна быть позже даты начала')

  for (const [field, max] of Object.entries({description: 5000, sku: 100, brand: 200, animal_type: 100, composition: 5000, feeding_guide: 5000, country_of_origin: 200, image_url: 2000, manufacturer_name: 300, manufacturer_address: 500, storage_conditions: 1500, conformity_number: 250, conformity_url: 2000, usage_restrictions: 2000, tnved_code: 50, okpd2_code: 50, feed_additive_registration_number: 250, feed_additive_registry_url: 2000})) {
    if (!partial || payload[field] !== undefined) data[field] = normalizeOptionalString(payload[field], max)
  }
  if (!partial && !data.animal_type) data.animal_type = 'horse'

  for (const [field, label] of [['conformity_url', 'ссылку на сертификат или декларацию'], ['feed_additive_registry_url', 'ссылку на реестр кормовой добавки']]) {
    if (!data[field]) continue
    let parsed
    try { parsed = new URL(data[field]) } catch { throw ApiError.badRequest(`Некорректная ${label}`) }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw ApiError.badRequest('Ссылка на документ должна использовать http или https')
  }

  if (!partial || payload.package_weight_kg !== undefined) {
    data.package_weight_kg = payload.package_weight_kg === '' || payload.package_weight_kg == null
      ? null
      : parseFiniteNumber(payload.package_weight_kg, 'Вес упаковки')
    if (data.package_weight_kg !== null && data.package_weight_kg <= 0) throw ApiError.badRequest('Вес упаковки должен быть больше 0')
  }
  if (!partial || payload.shelf_life_months !== undefined) {
    data.shelf_life_months = payload.shelf_life_months === '' || payload.shelf_life_months == null
      ? null
      : parsePositiveInteger(payload.shelf_life_months, 'Срок годности')
  }
  if (!partial || payload.category_id !== undefined) {
    data.category_id = payload.category_id === '' || payload.category_id == null ? null : parsePositiveInteger(payload.category_id, 'category_id')
    if (data.category_id !== null) {
      const category = await prisma.category.findUnique({where: {id: data.category_id}})
      if (!category) throw ApiError.badRequest('Категория не найдена')
    }
  }
  return data
}

const create = async payload => {
  const data = await normalizeProductData(payload)
  const product = await prisma.product.create({
    data,
    include: {category: true, media: {orderBy: {sort_order: 'asc'}}}
  })
  return withPromotionPricing(product)
}

const update = async (product_id, payload) => {
  const id = parsePositiveInteger(product_id, 'id товара')
  const product = await prisma.product.findFirst({where: {id, is_deleted: false}})
  if (!product) throw ApiError.notFound('Товар не найден')
  const data = await normalizeProductData(payload, {partial: true})
  if (!Object.keys(data).length) throw ApiError.badRequest('Нет полей для изменения')
  const updated = await prisma.product.update({where: {id}, data, include: {category: true, media: {orderBy: {sort_order: 'asc'}}}})
  return withPromotionPricing(updated)
}

const getAll = async ({
  page = 1,
  limit = 20,
  search,
  min_price,
  max_price,
  in_stock,
  category_id,
  category_slug,
  sort_by = 'catalog_position',
  sort_order = 'asc',
  on_sale = false,
  featured = false,
  stock_status
}) => {
  if (!Number.isSafeInteger(page) || page < 1) throw ApiError.badRequest('page должен быть целым числом >= 1')
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw ApiError.badRequest('limit должен быть целым числом от 1 до 100')
  if (!allowed_sort_fields.includes(sort_by)) throw ApiError.badRequest('Некорректное поле сортировки')
  if (!allowed_sort_orders.includes(sort_order)) throw ApiError.badRequest('Некорректный порядок сортировки')
  if (min_price !== undefined && (!Number.isFinite(min_price) || min_price < 0)) throw ApiError.badRequest('Некорректная минимальная цена')
  if (max_price !== undefined && (!Number.isFinite(max_price) || max_price < 0)) throw ApiError.badRequest('Некорректная максимальная цена')
  if (min_price !== undefined && max_price !== undefined && min_price > max_price) [min_price, max_price] = [max_price, min_price]

  const skip = (page - 1) * limit
  let resolved_category_id = category_id

  if (resolved_category_id !== undefined) {
    resolved_category_id = parsePositiveInteger(resolved_category_id, 'category_id')
  }

  if (category_slug) {
    const category = await prisma.category.findUnique({where: {slug: category_slug}})
    if (!category) {
      return {items: [], meta: {page, limit, total: 0, total_pages: 0, price_range: {min: 0, max: 0}}}
    }
    resolved_category_id = category.id
  }

  const normalized_search = typeof search === 'string' ? search.trim() : ''
  const now = new Date()
  const base_where = {
    is_deleted: false,
    ...(normalized_search ? {OR: [{name: {contains: normalized_search, mode: 'insensitive'}}, {description: {contains: normalized_search, mode: 'insensitive'}}, {sku: {contains: normalized_search, mode: 'insensitive'}}, {brand: {contains: normalized_search, mode: 'insensitive'}}]} : {}),
    ...(in_stock === true ? {stock: {gt: 0}} : {}),
    ...(stock_status === 'in_stock' ? {stock: {gt: 0}} : {}),
    ...(stock_status === 'out_of_stock' ? {stock: 0} : {}),
    ...(stock_status === 'low_stock' ? {stock: {gt: 0, lte: 5}} : {}),
    ...(resolved_category_id !== undefined ? {category_id: resolved_category_id} : {}),
    ...(on_sale ? {sale_percent: {gt: 0}, AND: [{OR: [
      {sale_starts_at: null, sale_ends_at: null},
      {sale_starts_at: null, sale_ends_at: {gt: now}},
      {sale_starts_at: {lte: now}, sale_ends_at: null},
      {sale_starts_at: {lte: now}, sale_ends_at: {gt: now}}
    ]}]} : {}),
    ...(featured ? {is_featured: true} : {})
  }
  const where = {
    ...base_where,
    ...((min_price !== undefined || max_price !== undefined)
      ? {price: {...(min_price !== undefined ? {gte: min_price} : {}), ...(max_price !== undefined ? {lte: max_price} : {})}}
      : {})
  }

  const order_by = sort_by === 'catalog_position'
    ? [{catalog_position: sort_order}, {created_at: 'desc'}, {id: 'asc'}]
    : [{[sort_by]: sort_order}, {catalog_position: 'asc'}, {id: 'asc'}]

  const [items, total, price_bounds] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: order_by,
      skip,
      take: limit,
      include: {category: true, media: {orderBy: {sort_order: 'asc'}}}
    }),
    prisma.product.count({where}),
    prisma.product.aggregate({where: base_where, _min: {price: true}, _max: {price: true}})
  ])

  return {
    items: items.map(item => withPromotionPricing(item)),
    meta: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      price_range: {
        min: price_bounds._min.price == null ? 0 : Number(price_bounds._min.price),
        max: price_bounds._max.price == null ? 0 : Number(price_bounds._max.price)
      }
    }
  }
}

const getById = async product_id => {
  const id = parsePositiveInteger(product_id, 'id товара')
  const product = await prisma.product.findFirst({
    where: {id, is_deleted: false},
    include: {category: true, media: {orderBy: {sort_order: 'asc'}}}
  })

  if (!product) throw ApiError.notFound('Товар не найден')
  return withPromotionPricing(product)
}

const remove = async product_id => {
  const id = parsePositiveInteger(product_id, 'id товара')
  const product = await prisma.product.findFirst({where: {id, is_deleted: false}})
  if (!product) throw ApiError.notFound('Товар не найден')

  const media = await prisma.productMedia.findMany({where: {product_id: id}, select: {storage_key: true}})
  await prisma.$transaction([
    prisma.productMedia.deleteMany({where: {product_id: id}}),
    prisma.product.update({where: {id}, data: {is_deleted: true}})
  ])
  await Promise.all(media.map(item => deleteStoredMedia(item.storage_key).catch(error => console.error('Не удалось удалить медиафайл', item.storage_key, error))))
  return {message: 'Товар успешно удалён'}
}

export default {create, update, getAll, remove, getById}
