import category_service from '../../services/category.service'
import {sendJsonError} from '../../utils/http'

export default defineEventHandler(async event => {
  try {
    return await category_service.getById(getRouterParam(event, 'id'))
  } catch (error) {
    sendJsonError(error)
  }
})
