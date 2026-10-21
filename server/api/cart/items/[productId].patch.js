import cart_service from '../../../services/cart.service'
import {guest_cookie_options} from '../../../utils/cookies'
import {optionalAuth, sendJsonError} from '../../../utils/http'

export default defineEventHandler(async event => {
  try {
    const {quantity} = (await readBody(event)) || {}
    const result = await cart_service.updateItemQuantity(await optionalAuth(event), {
      product_id: getRouterParam(event, 'productId'),
      quantity
    })
    if (result.should_set_guest_cookie) setCookie(event, 'guest_token', result.guest_token, guest_cookie_options)
    return result.cart
  } catch (error) {
    sendJsonError(error)
  }
})
