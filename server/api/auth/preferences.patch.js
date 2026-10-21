import auth_service from '../../services/auth.service'
import {requireAuth, sendJsonError} from '../../utils/http'

export default defineEventHandler(async event => {
  try {
    const request = await requireAuth(event)
    const body = (await readBody(event)) || {}
    return await auth_service.updatePreferences(request.user.id, body)
  } catch (error) {
    sendJsonError(error)
  }
})
