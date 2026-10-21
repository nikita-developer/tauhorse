import product_service from '../../services/product.service'
import {sendJsonError} from '../../utils/http'
import {parseFiniteNumber} from '../../utils/validation'

export default defineEventHandler(async event => {
  try {
    const query = getQuery(event)
    const page = Number(query.page ?? 1)
    const limit = Number(query.limit ?? 20)
    const min_price = query.min_price !== undefined ? parseFiniteNumber(query.min_price, 'min_price') : undefined
    const max_price = query.max_price !== undefined ? parseFiniteNumber(query.max_price, 'max_price') : undefined
    const category_id = query.category_id !== undefined ? Number(query.category_id) : undefined
    const in_stock = query.in_stock === '1' || query.in_stock === 'true' || query.in_stock === true

    return await product_service.getAll({
      page,
      limit,
      search: query.search,
      min_price,
      max_price,
      in_stock,
      category_id,
      category_slug: query.category_slug,
      sort_by: query.sort_by ?? 'catalog_position',
      sort_order: query.sort_order ?? 'asc',
      on_sale: query.on_sale === '1' || query.on_sale === 'true' || query.on_sale === true,
      featured: query.featured === '1' || query.featured === 'true' || query.featured === true,
      stock_status: query.stock_status
    })
  } catch (error) {
    sendJsonError(error)
  }
})
