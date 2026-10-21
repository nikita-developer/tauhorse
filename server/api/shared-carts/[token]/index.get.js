import shared_cart_service from '../../../services/shared-cart.service.js'
import {sendJsonError} from '../../../utils/http.js'
export default defineEventHandler(async event=>{try{return await shared_cart_service.get(getRouterParam(event,'token'))}catch(e){sendJsonError(e)}})
