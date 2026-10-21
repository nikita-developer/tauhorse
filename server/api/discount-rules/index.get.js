import discount_service from '../../services/discount.service.js'
export default defineEventHandler(()=>discount_service.listActive())
