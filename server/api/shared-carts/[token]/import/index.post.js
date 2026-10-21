import shared_cart_service from '../../../../services/shared-cart.service.js'
import {guest_cookie_options} from '../../../../utils/cookies.js'
import {optionalAuth,sendJsonError} from '../../../../utils/http.js'
import {enforceRateLimit} from '../../../../utils/rate-limit.js'

export default defineEventHandler(async event=>{try{
  enforceRateLimit(event,{key:'cart-share-import',limit:60,window_ms:15*60*1000})
  const result=await shared_cart_service.importIntoCart(await optionalAuth(event),getRouterParam(event,'token'))
  if(result.should_set_guest_cookie) setCookie(event,'guest_token',result.guest_token,guest_cookie_options)
  return result.cart
}catch(e){sendJsonError(e)}})
