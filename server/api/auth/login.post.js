import auth_service from '../../services/auth.service'
import cart_service from '../../services/cart.service'
import {refresh_cookie_options} from '../../utils/cookies'
import {createRequestContext, sendJsonError} from '../../utils/http'
import {enforceRateLimit} from '../../utils/rate-limit'

export default defineEventHandler(async event => {
  try {
    enforceRateLimit(event, {key: 'auth-login', limit: 20, window_ms: 15 * 60 * 1000})
    const {email, password} = (await readBody(event)) || {}
    const result = await auth_service.login({
      email,
      password,
      user_agent: getHeader(event, 'user-agent') || null,
      ip_address: getRequestIP(event, {xForwardedFor: true}) || null
    })

    try {
      await cart_service.mergeGuestCartWithUserCart(createRequestContext(event), result.user.id)
      deleteCookie(event, 'guest_token', {path: '/'})
    } catch (merge_error) {
      console.error('Не удалось объединить гостевую корзину:', merge_error)
    }

    setCookie(event, 'refresh_token', result.refresh_token, refresh_cookie_options)

    return {
      user: result.user,
      access_token: result.access_token
    }
  } catch (error) {
    sendJsonError(error)
  }
})
