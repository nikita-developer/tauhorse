import auth_service from '../../services/auth.service'
import {requireAuth, sendJsonError} from '../../utils/http'

export default defineEventHandler(async event => {
  try {
    const request = await requireAuth(event)
    return await auth_service.getMe(request.user.id)
  } catch (error) {
    sendJsonError(error)
  }
})
