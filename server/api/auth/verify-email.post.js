import auth_service from '../../services/auth.service'
import {sendJsonError} from '../../utils/http'
import {enforceRateLimit} from '../../utils/rate-limit'

export default defineEventHandler(async event => {
  try {
    enforceRateLimit(event, {key: 'auth-verify-email', limit: 10, window_ms: 15 * 60 * 1000})
    const {token} = (await readBody(event)) || {}
    await auth_service.verifyEmail(token)
    return {message: 'Email подтверждён. Теперь можно войти в аккаунт.'}
  } catch (error) {
    sendJsonError(error)
  }
})
