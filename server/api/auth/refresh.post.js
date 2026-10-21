import auth_service from '../../services/auth.service'
import {refresh_cookie_options} from '../../utils/cookies'
import {sendJsonError} from '../../utils/http'
import {enforceRateLimit} from '../../utils/rate-limit'

export default defineEventHandler(async event => {
  try {
    enforceRateLimit(event, {key: 'auth-refresh', limit: 60, window_ms: 15 * 60 * 1000})
    const token = getCookie(event, 'refresh_token')
    const result = await auth_service.refresh(token, {
      user_agent: getHeader(event, 'user-agent') || null,
      ip_address: getRequestIP(event, {xForwardedFor: true}) || null
    })
    setCookie(event, 'refresh_token', result.refresh_token, refresh_cookie_options)
    return {access_token: result.access_token}
  } catch (error) {
    sendJsonError(error)
  }
})
