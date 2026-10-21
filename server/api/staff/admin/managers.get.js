import staff from '../../../services/staff.service.js'; import {requirePermission} from '../../../utils/access.js'; import {sendJsonError} from '../../../utils/http.js'
export default defineEventHandler(async e=>{try{await requirePermission(e,'can_manage_orders');return await staff.listManagers()}catch(x){sendJsonError(x)}})
