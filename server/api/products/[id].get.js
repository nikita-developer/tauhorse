import product_service from '../../services/product.service'
import {sendJsonError} from '../../utils/http'

export default defineEventHandler(async event => {
  try {
    return await product_service.getById(Number(getRouterParam(event, 'id')))
  } catch (error) {
    sendJsonError(error)
  }
})
