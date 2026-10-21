import order_service from '../../../services/order.service'
import {optionalAuth, sendJsonError} from '../../../utils/http'

export default defineEventHandler(async event => {
  try {
    return await order_service.getGuestOrders(await optionalAuth(event))
  } catch (error) {
    sendJsonError(error)
  }
})
