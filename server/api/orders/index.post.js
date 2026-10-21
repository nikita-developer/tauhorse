import order_service from '../../services/order.service'
import {guest_cookie_options} from '../../utils/cookies'
import {optionalAuth, sendJsonError} from '../../utils/http'
import {enforceRateLimit} from '../../utils/rate-limit'

export default defineEventHandler(async event => {
  try {
    enforceRateLimit(event, {key: 'order-create', limit: 20, window_ms: 60 * 60 * 1000})
    const body = await readBody(event)
    const result = await order_service.createOrderFromCart(await optionalAuth(event), body || {})
    if (result.should_set_guest_cookie) setCookie(event, 'guest_token', result.guest_token, guest_cookie_options)
    setResponseStatus(event, 201)
    return result.order
  } catch (error) {
    sendJsonError(error)
  }
})
