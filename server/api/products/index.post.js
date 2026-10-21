import product_service from '../../services/product.service.js'
import {requirePermission} from '../../utils/access.js'
import {writeAuditLog,auditActions} from '../../utils/audit.js'
import {sendJsonError} from '../../utils/http.js'
export default defineEventHandler(async event=>{try{const request=await requirePermission(event,'can_manage_catalog');const body=await readBody(event);const product=await product_service.create(body||{});await writeAuditLog({request,action:auditActions.PRODUCT_CREATE,entity_type:'product',entity_id:product.id,entity_label:product.name,details:{sku:product.sku}});setResponseStatus(event,201);return product}catch(error){sendJsonError(error)}})
