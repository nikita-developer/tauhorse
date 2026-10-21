import auth_service from '../../../services/auth.service'
import {requireAuth, sendJsonError} from '../../../utils/http'

export default defineEventHandler(async event => {
  try {
    const request = await requireAuth(event)
    await auth_service.logoutSessionById(request.user.id, getRouterParam(event, 'id'))
    return {message: 'Сессия завершена'}
  } catch (error) {
    sendJsonError(error)
  }
})
