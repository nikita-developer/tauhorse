import order_service from '../../services/order.service'
import {requireAuth, sendJsonError} from '../../utils/http'

export default defineEventHandler(async event => {
  try {
    return await order_service.getMyOrders(await requireAuth(event))
  } catch (error) {
    sendJsonError(error)
  }
})
