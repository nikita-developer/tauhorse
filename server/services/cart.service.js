import prisma from '../config/prisma.js'
import {generateGuestToken} from '../utils/guest.js'
import {ApiError} from '../utils/api-error.js'
import {parsePositiveInteger, roundMoney} from '../utils/validation.js'
import {calculateDiscount} from '../utils/discount.js'
import {withPromotionPricing} from '../utils/promotion.js'
import {getCartLineTotal, getCartSubtotal, getCartRegularLineTotal, getCartRegularSubtotal, getCartPromotionSavings} from '../utils/cart-pricing.js'

const getCartOwnerData = request => {
  if (request.user?.id) {
    return {
      user_id: request.user.id,
      guest_token: null,
      should_set_guest_cookie: false
    }
  }

  let guest_token = request.cookies?.guest_token
  let should_set_guest_cookie = false

  if (!guest_token) {
    guest_token = generateGuestToken()
    should_set_guest_cookie = true
  }

  return {user_id: null, guest_token, should_set_guest_cookie}
}

const cart_include = {
  items: {
    include: {product: true}
  }
}

const getOrCreateCart = async request => {
  const {user_id, guest_token, should_set_guest_cookie} = getCartOwnerData(request)
  const owner = user_id ? {user_id} : {guest_token}

  let cart = user_id
    ? await prisma.cart.upsert({
        where: {user_id},
        update: {},
        create: {user_id},
        include: cart_include
      })
    : await prisma.cart.upsert({
        where: {guest_token},
        update: {},
        create: {guest_token},
        include: cart_include
      })

  const unavailable_item_ids = cart.items
    .filter(item => item.product.is_deleted)
    .map(item => item.id)

  if (unavailable_item_ids.length > 0) {
    await prisma.cartItem.deleteMany({where: {id: {in: unavailable_item_ids}}})
    cart = await prisma.cart.findUnique({where: {id: cart.id}, include: cart_include})
  }

  return {cart, guest_token, should_set_guest_cookie}
}

const calculateCartTotal = cart => getCartSubtotal(cart.items)

const formatCart = (cart, rules = []) => {
  const subtotal = calculateCartTotal(cart)
  const regular_subtotal = getCartRegularSubtotal(cart.items)
  const promotion_discount_amount = getCartPromotionSavings(cart.items)
  const items_count = cart.items.filter(item => !item.product.is_deleted).reduce((sum,item)=>sum+item.quantity,0)
  const discount = calculateDiscount(subtotal, rules)
  return ({
  id: cart.id,
  user_id: cart.user_id,
  created_at: cart.created_at,
  updated_at: cart.updated_at,
  items: cart.items
    .filter(item => !item.product.is_deleted)
    .map(item => ({
      id: item.id,
      quantity: item.quantity,
      product: withPromotionPricing(item.product),
      regular_total_price: getCartRegularLineTotal(item.product, item.quantity),
      total_price: getCartLineTotal(item.product, item.quantity)
    })),
  regular_subtotal,
  promotion_discount_amount,
  subtotal,
  items_count,
  discount_percent: discount.percent,
  discount_amount: discount.amount,
  total_price: discount.total_after_discount
})
}

const getMyCart = async request => {
  if (!request.user?.id) {
    const guest_token = request.cookies?.guest_token

    if (!guest_token) {
      return {
        cart: {id: null, user_id: null, items: [], total_price: 0},
        guest_token: null,
        should_set_guest_cookie: false
      }
    }

    let cart = await prisma.cart.findUnique({where: {guest_token}, include: cart_include})

    if (!cart) {
      return {
        cart: {id: null, user_id: null, items: [], total_price: 0},
        guest_token,
        should_set_guest_cookie: false
      }
    }

    const unavailable_item_ids = cart.items
      .filter(item => item.product.is_deleted)
      .map(item => item.id)

    if (unavailable_item_ids.length > 0) {
      await prisma.cartItem.deleteMany({where: {id: {in: unavailable_item_ids}}})
      cart = await prisma.cart.findUnique({where: {id: cart.id}, include: cart_include})
    }

    const rules = await prisma.discountRule.findMany({where:{is_active:true}})
    return {cart: formatCart(cart, rules), guest_token, should_set_guest_cookie: false}
  }

  const {cart} = await getOrCreateCart(request)
  const rules = await prisma.discountRule.findMany({where:{is_active:true}})
  return {cart: formatCart(cart, rules), guest_token: null, should_set_guest_cookie: false}
}

const addItem = async (request, {product_id, quantity}) => {
  product_id = parsePositiveInteger(product_id, 'product_id')
  quantity = parsePositiveInteger(quantity, 'quantity')

  const product = await prisma.product.findFirst({
    where: {id: product_id, is_deleted: false}
  })

  if (!product) throw ApiError.notFound('Товар не найден')
  if (quantity > product.stock) throw ApiError.badRequest(`Доступно только ${product.stock} шт.`)

  const {cart, guest_token, should_set_guest_cookie} = await getOrCreateCart(request)

  await prisma.$transaction(async tx => {
    const existing_item = await tx.cartItem.findUnique({
      where: {cart_id_product_id: {cart_id: cart.id, product_id}}
    })

    const next_quantity = existing_item ? existing_item.quantity + quantity : quantity

    if (next_quantity > product.stock) {
      throw ApiError.badRequest(`Доступно только ${product.stock} шт.`)
    }

    if (existing_item) {
      await tx.cartItem.update({where: {id: existing_item.id}, data: {quantity: next_quantity}})
    } else {
      await tx.cartItem.create({data: {cart_id: cart.id, product_id, quantity}})
    }
  })

  const updated_cart = await prisma.cart.findUnique({where: {id: cart.id}, include: cart_include})
  const rules = await prisma.discountRule.findMany({where:{is_active:true}})
  return {cart: formatCart(updated_cart, rules), guest_token, should_set_guest_cookie}
}

const updateItemQuantity = async (request, {product_id, quantity}) => {
  product_id = parsePositiveInteger(product_id, 'product_id')
  quantity = parsePositiveInteger(quantity, 'quantity')
  const {cart, guest_token, should_set_guest_cookie} = await getOrCreateCart(request)

  const [item, product] = await Promise.all([
    prisma.cartItem.findUnique({where: {cart_id_product_id: {cart_id: cart.id, product_id}}}),
    prisma.product.findFirst({where: {id: product_id, is_deleted: false}})
  ])

  if (!item) throw ApiError.notFound('Товар в корзине не найден')
  if (!product) throw ApiError.notFound('Товар не найден')
  if (quantity > product.stock) throw ApiError.badRequest(`Доступно только ${product.stock} шт.`)

  await prisma.cartItem.update({where: {id: item.id}, data: {quantity}})
  const updated_cart = await prisma.cart.findUnique({where: {id: cart.id}, include: cart_include})
  const rules = await prisma.discountRule.findMany({where:{is_active:true}})
  return {cart: formatCart(updated_cart, rules), guest_token, should_set_guest_cookie}
}

const removeItem = async (request, {product_id}) => {
  product_id = parsePositiveInteger(product_id, 'product_id')
  const {cart, guest_token, should_set_guest_cookie} = await getOrCreateCart(request)

  const item = await prisma.cartItem.findUnique({
    where: {cart_id_product_id: {cart_id: cart.id, product_id}}
  })

  if (!item) throw ApiError.notFound('Товар в корзине не найден')

  await prisma.cartItem.delete({where: {id: item.id}})
  const updated_cart = await prisma.cart.findUnique({where: {id: cart.id}, include: cart_include})
  const rules = await prisma.discountRule.findMany({where:{is_active:true}})
  return {cart: formatCart(updated_cart, rules), guest_token, should_set_guest_cookie}
}

const mergeGuestCartWithUserCart = async (request, user_id) => {
  const guest_token = request.cookies?.guest_token
  if (!guest_token) return null

  const guest_cart = await prisma.cart.findUnique({
    where: {guest_token},
    include: {items: true}
  })

  if (!guest_cart) return null

  let user_cart = await prisma.cart.findUnique({where: {user_id}, include: {items: true}})

  if (!user_cart) {
    user_cart = await prisma.cart.create({data: {user_id}, include: {items: true}})
  }

  await prisma.$transaction(async tx => {
    for (const guest_item of guest_cart.items) {
      const product = await tx.product.findFirst({
        where: {id: guest_item.product_id, is_deleted: false}
      })

      if (!product || product.stock <= 0) continue

      const existing_user_item = await tx.cartItem.findUnique({
        where: {cart_id_product_id: {cart_id: user_cart.id, product_id: guest_item.product_id}}
      })

      const next_quantity = existing_user_item
        ? existing_user_item.quantity + guest_item.quantity
        : guest_item.quantity
      const safe_quantity = Math.min(next_quantity, product.stock)

      if (safe_quantity <= 0) continue

      if (existing_user_item) {
        await tx.cartItem.update({where: {id: existing_user_item.id}, data: {quantity: safe_quantity}})
      } else {
        await tx.cartItem.create({
          data: {cart_id: user_cart.id, product_id: guest_item.product_id, quantity: safe_quantity}
        })
      }
    }

    await tx.cartItem.deleteMany({where: {cart_id: guest_cart.id}})
    await tx.cart.delete({where: {id: guest_cart.id}})
  })

  return true
}

export default {
  getMyCart,
  addItem,
  updateItemQuantity,
  removeItem,
  mergeGuestCartWithUserCart
}
