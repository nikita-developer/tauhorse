import auth_service from '../../services/auth.service'
import {sendJsonError} from '../../utils/http'
import {enforceRateLimit} from '../../utils/rate-limit'
import {validateRegistrationBotSignals} from '../../utils/bot-protection'

export default defineEventHandler(async event => {
  try {
    enforceRateLimit(event, {key: 'auth-register', limit: 5, window_ms: 60 * 60 * 1000})
    const {email, password, website, form_started_at} = (await readBody(event)) || {}
    validateRegistrationBotSignals({website, form_started_at})
    const result = await auth_service.register({email, password})
    return {user: result.user, verification_required: true, message: 'Аккаунт создан. Подтвердите email по ссылке из письма.'}
  } catch (error) { sendJsonError(error) }
})
