import product_service from '../../services/product.service.js'
import {requirePermission} from '../../utils/access.js'
import {writeAuditLog,auditActions} from '../../utils/audit.js'
import {sendJsonError} from '../../utils/http.js'
export default defineEventHandler(async event=>{try{const request=await requirePermission(event,'can_manage_catalog');const body=(await readBody(event))||{};const before=await product_service.getById(getRouterParam(event,'id'));const product=await product_service.update(getRouterParam(event,'id'),body);await writeAuditLog({request,action:auditActions.PRODUCT_UPDATE,entity_type:'product',entity_id:product.id,entity_label:product.name,details:{changes:Object.fromEntries(Object.keys(body).map(k=>[k,{before:before[k]??null,after:product[k]??null}]))}});return product}catch(error){sendJsonError(error)}})
