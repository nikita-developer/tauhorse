import auth_service from '../../services/auth.service'
import {refresh_cookie_options} from '../../utils/cookies'
import {requireAuth, sendJsonError} from '../../utils/http'

export default defineEventHandler(async event => {
  try {
    const request = await requireAuth(event)
    await auth_service.logoutAll(request.user.id)
    deleteCookie(event, 'refresh_token', refresh_cookie_options)
    return {message: 'Вы вышли со всех устройств'}
  } catch (error) {
    sendJsonError(error)
  }
})
