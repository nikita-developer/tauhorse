import order_service from '../../services/order.service'
import {optionalAuth, sendJsonError} from '../../utils/http'

export default defineEventHandler(async event => {
  try {
    return await order_service.getOrderById(await optionalAuth(event), getRouterParam(event, 'id'))
  } catch (error) {
    sendJsonError(error)
  }
})
