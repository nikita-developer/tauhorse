import order_service from '../../../services/order.service.js'
import {requirePermission} from '../../../utils/access.js'
import {sendJsonError} from '../../../utils/http.js'
export default defineEventHandler(async event=>{try{
  const request=await requirePermission(event,'can_manage_orders')
  const query=getQuery(event)
  const min_total=query.min_total!==undefined&&query.min_total!==''?Number(query.min_total):undefined
  const max_total=query.max_total!==undefined&&query.max_total!==''?Number(query.max_total):undefined
  return await order_service.getAdminOrders(request,{page:Number(query.page??1),limit:Number(query.limit??20),status:query.status,email:typeof query.email==='string'?query.email.trim():undefined,sort_by:query.sort_by??'created_at',sort_order:query.sort_order??'desc',date_from:query.date_from,date_to:query.date_to,min_total,max_total,assigned_manager_id:query.assigned_manager_id,credited_manager_id:query.credited_manager_id})
}catch(error){sendJsonError(error)}})
