import auth_service from '../../services/auth.service'
import {sendJsonError} from '../../utils/http'
import {enforceRateLimit} from '../../utils/rate-limit'

export default defineEventHandler(async event => {
  try {
    enforceRateLimit(event, {key: 'auth-resend-verification', limit: 3, window_ms: 15 * 60 * 1000})
    const {email} = (await readBody(event)) || {}
    await auth_service.resendVerification(email)
    return {message: 'Если аккаунт ожидает подтверждения, новое письмо отправлено.'}
  } catch (error) {
    sendJsonError(error)
  }
})
