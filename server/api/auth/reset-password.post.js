import auth_service from '../../services/auth.service'
import {sendJsonError} from '../../utils/http'
import {enforceRateLimit} from '../../utils/rate-limit'

export default defineEventHandler(async event => {
  try {
    enforceRateLimit(event, {key: 'auth-reset-password', limit: 10, window_ms: 15 * 60 * 1000})
    const {token, password} = (await readBody(event)) || {}
    await auth_service.resetPassword(token, password)
    deleteCookie(event, 'refresh_token', {path: '/'})
    return {message: 'Пароль успешно изменён'}
  } catch (error) {
    sendJsonError(error)
  }
})
