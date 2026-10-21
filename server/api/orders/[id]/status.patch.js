import order_service from '../../../services/order.service.js'
import {ApiError} from '../../../utils/api-error.js'
import {requirePermission} from '../../../utils/access.js'
import {sendJsonError} from '../../../utils/http.js'
export default defineEventHandler(async event=>{try{const request=await requirePermission(event,'can_manage_orders');const{status}=(await readBody(event))||{};if(!status)throw ApiError.badRequest('status обязателен');return await order_service.updateOrderStatus(request,getRouterParam(event,'id'),status)}catch(error){sendJsonError(error)}})
