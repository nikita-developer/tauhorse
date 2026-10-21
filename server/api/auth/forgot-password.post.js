import auth_service from '../../services/auth.service'
import {sendJsonError} from '../../utils/http'
import {enforceRateLimit} from '../../utils/rate-limit'

export default defineEventHandler(async event => {
  try {
    enforceRateLimit(event, {key: 'auth-forgot-password', limit: 5, window_ms: 15 * 60 * 1000})
    const {email} = (await readBody(event)) || {}
    await auth_service.forgotPassword(email)
    return {message: 'Если аккаунт существует, инструкция отправлена на email'}
  } catch (error) {
    sendJsonError(error)
  }
})
