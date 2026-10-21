import crypto from 'node:crypto'
import prisma from '../config/prisma.js'
import cart_service from './cart.service.js'
import {hashToken} from '../utils/hash.js'
import {ApiError} from '../utils/api-error.js'
import {withPromotionPricing} from '../utils/promotion.js'

const create = async request => {
  const result = await cart_service.getMyCart(request)
  if (!result.cart.items.length) throw ApiError.badRequest('Нельзя поделиться пустой корзиной')
  const token = crypto.randomBytes(24).toString('base64url')
  const expires_at = new Date(Date.now() + 30*24*60*60*1000)
  await prisma.sharedCart.create({data:{token_hash:hashToken(token),expires_at,items:{create:result.cart.items.map(i=>({product_id:i.product.id,quantity:i.quantity}))}}})
  return {token, expires_at}
}
const get = async token => {
  const shared = await prisma.sharedCart.findUnique({where:{token_hash:hashToken(token)},include:{items:{include:{product:{include:{category:true,media:{orderBy:{sort_order:'asc'}}}}}}}})
  if (!shared || shared.expires_at <= new Date()) throw ApiError.notFound('Ссылка на корзину недействительна или истекла')
  const items=shared.items.filter(i=>!i.product.is_deleted).map(i=>({...i,product:withPromotionPricing(i.product),quantity:Math.min(i.quantity,i.product.stock)})).filter(i=>i.quantity>0)
  return {created_at:shared.created_at,expires_at:shared.expires_at,items}
}
const importIntoCart = async (request, token) => {
  const shared=await get(token)
  let guest_token = request.cookies?.guest_token || null
  for (const item of shared.items) {
    try {
      const added = await cart_service.addItem(request,{product_id:item.product_id,quantity:item.quantity})
      if (added.guest_token) {
        guest_token = added.guest_token
        request.cookies = {...(request.cookies || {}), guest_token}
      }
    } catch (e) {
      if (e?.status !== 400) throw e
    }
  }
  const result = await cart_service.getMyCart(request)
  return {cart: result.cart, guest_token, should_set_guest_cookie: Boolean(guest_token && !request.user?.id)}
}
export default {create,get,importIntoCart}
