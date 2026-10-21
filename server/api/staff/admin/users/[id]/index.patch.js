import staff from '../../../../../services/staff.service.js'; import {requireAdmin,sendJsonError} from '../../../../../utils/http.js'
export default defineEventHandler(async e=>{try{const request=await requireAdmin(e);return await staff.updateUser(request,getRouterParam(e,'id'),await readBody(e)||{})}catch(x){sendJsonError(x)}})
