import auth_service from '../../services/auth.service'
import {refresh_cookie_options} from '../../utils/cookies'
import {sendJsonError} from '../../utils/http'

export default defineEventHandler(async event => {
  try {
    const token = getCookie(event, 'refresh_token')
    await auth_service.logout(token)
    deleteCookie(event, 'refresh_token', refresh_cookie_options)
    return {message: 'Вы вышли из системы'}
  } catch (error) {
    sendJsonError(error)
  }
})
