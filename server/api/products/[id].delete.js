import product_service from '../../services/product.service.js'
import {requirePermission} from '../../utils/access.js'
import {writeAuditLog,auditActions} from '../../utils/audit.js'
import {sendJsonError} from '../../utils/http.js'
export default defineEventHandler(async event=>{try{const request=await requirePermission(event,'can_manage_catalog');const id=Number(getRouterParam(event,'id'));const product=await product_service.getById(id);const result=await product_service.remove(id);await writeAuditLog({request,action:auditActions.PRODUCT_DELETE,entity_type:'product',entity_id:id,entity_label:product.name,details:{sku:product.sku}});return result}catch(error){sendJsonError(error)}})
