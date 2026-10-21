import category_service from '../../services/category.service'
import {sendJsonError} from '../../utils/http'

export default defineEventHandler(async () => {
  try {
    return await category_service.getAll()
  } catch (error) {
    sendJsonError(error)
  }
})
