import shared_cart_service from '../../../services/shared-cart.service.js'
import {optionalAuth,sendJsonError} from '../../../utils/http.js'
import {enforceRateLimit} from '../../../utils/rate-limit.js'

export default defineEventHandler(async event=>{try{
  enforceRateLimit(event,{key:'cart-share',limit:30,window_ms:60*60*1000})
  return await shared_cart_service.create(await optionalAuth(event))
}catch(e){sendJsonError(e)}})
