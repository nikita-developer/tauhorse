import prisma from '../config/prisma.js'
import {resolveGuestData} from '../utils/guest.js'
import {
  isValidOrderStatus,
  canChangeOrderStatus,
  allowed_order_statuses,
  getOrderStatusLabel,
  canCustomerCancelOrder,
  resolveOrderCreditManagerId
} from '../utils/order-status.js'
import {generateOrderToken} from '../utils/order-token.js'
import {hashToken} from '../utils/hash.js'
import {calculateDeliveryPrice, delivery_methods} from '../utils/delivery.js'
import mail_service from './mail.service.js'
import {ApiError} from '../utils/api-error.js'
import {calculateDiscount} from '../utils/discount.js'
import {generateGuestToken} from '../utils/guest.js'
import {writeAuditLog,auditActions} from '../utils/audit.js'
import {getEffectiveProductPrice} from '../utils/promotion.js'
import {
  normalizeEmail,
  parsePositiveInteger,
  requireTrimmedString,
  roundMoney
} from '../utils/validation.js'

const allowed_admin_order_sort_fields = ['created_at', 'total_price', 'status']
const allowed_sort_orders = ['asc', 'desc']

const withoutOrderSecret = order => {
  if (!order) return order
  const can_cancel=canCustomerCancelOrder(order)
  const {access_token:_stored_secret,guest_token:_guest_secret,admin_note:_admin_note,assigned_manager_id:_assigned,assigned_at:_assigned_at,credited_manager_id:_credited,...safe_order}=order
  return {...safe_order,can_cancel}
}

const withoutAdminOrderSecret = order => {
  if (!order) return order
  const {access_token: _stored_secret, guest_token: _guest_secret, ...safe_order} = order
  return safe_order
}

const validateOrderForm = ({email, name, phone, address, postal_code, comment, delivery_method = 'seller_courier', terms_accepted, idempotency_key}) => ({
  email: normalizeEmail(email),
  name: requireTrimmedString(name, 'Имя', {max_length: 120}),
  phone: requireTrimmedString(phone, 'Телефон', {max_length: 50}),
  address: delivery_method === 'pickup' ? 'Самовывоз' : requireTrimmedString(address, 'Адрес', {max_length: 500}),
  postal_code: typeof postal_code === 'string' ? postal_code.trim().slice(0, 20) || null : null,
  comment: typeof comment === 'string' ? comment.trim().slice(0, 1000) || null : null,
  delivery_method: delivery_methods.includes(delivery_method) ? delivery_method : (() => { throw ApiError.badRequest('Некорректный способ доставки') })(),
  idempotency_key: requireTrimmedString(idempotency_key, 'Ключ оформления заказа', {max_length: 100}),
  terms_accepted_at: terms_accepted === true ? new Date() : (() => { throw ApiError.badRequest('Необходимо принять публичную оферту') })(),
  terms_version: '2026-09-06'
})

const idempotentOrderResult = (request, order) => {
  const same_user = Boolean(request.user?.id && order.user_id === request.user.id)
  const same_guest = Boolean(request.cookies?.guest_token && order.guest_token === request.cookies.guest_token)
  if (!same_user && !same_guest) throw ApiError.forbidden('Ключ оформления уже использован')
  return {order: withoutOrderSecret(order), guest_token: null, should_set_guest_cookie: false}
}

const getExistingCart = async request => {
  const {user_id, guest_token, should_set_guest_cookie} = resolveGuestData(request)
  const owner_where = user_id ? {user_id} : {guest_token}

  const cart = await prisma.cart.findUnique({
    where: owner_where,
    include: {
      items: {
        include: {product: true}
      }
    }
  })

  return {cart, guest_token, should_set_guest_cookie}
}

const createOrderFromCart = async (request, form) => {
  const customer = validateOrderForm(form)
  const existing_order = await prisma.order.findUnique({where: {idempotency_key: customer.idempotency_key}, include: {items: {include: {product: true}}}})
  if (existing_order) return idempotentOrderResult(request, existing_order)
  const {cart, guest_token, should_set_guest_cookie} = await getExistingCart(request)

  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest('Корзина пуста')
  }

  for (const item of cart.items) {
    if (item.product.is_deleted) {
      throw ApiError.badRequest(`Товар "${item.product.name}" больше недоступен`)
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw ApiError.badRequest(`Некорректное количество товара "${item.product.name}"`)
    }
  }

  const subtotal = roundMoney(cart.items.reduce((total, item) => {
    return total + item.quantity * getEffectiveProductPrice(item.product)
  }, 0))
  const discount_rules = await prisma.discountRule.findMany({where: {is_active: true}})
  const discount = calculateDiscount(subtotal, discount_rules)
  const delivery_price = calculateDeliveryPrice(subtotal, customer.delivery_method)
  const total_price = roundMoney(discount.total_after_discount + delivery_price)

  const is_guest = !request.user?.id
  const raw_order_token = is_guest ? generateOrderToken() : null
  const stored_order_token = raw_order_token
    ? hashToken(raw_order_token)
    : hashToken(generateOrderToken())

  let created_order
  try {
    created_order = await prisma.$transaction(async tx => {
    for (const item of cart.items) {
      const updated = await tx.product.updateMany({
        where: {
          id: item.product_id,
          is_deleted: false,
          stock: {gte: item.quantity}
        },
        data: {
          stock: {decrement: item.quantity}
        }
      })

      if (updated.count === 0) {
        throw ApiError.badRequest(`Недостаточно товара "${item.product.name}" на складе`)
      }
    }

    const order = await tx.order.create({
      data: {
        user_id: request.user?.id || null,
        guest_token: is_guest ? guest_token : null,
        ...customer,
        subtotal,
        discount_percent: discount.percent,
        discount_amount: discount.amount,
        delivery_price,
        delivery_price_confirmed: customer.delivery_method === 'pickup',
        total_price,
        // The database stores only a SHA-256 hash for newly created orders.
        // Legacy rows may still contain a raw token and are supported on read.
        access_token: stored_order_token,
        items: {
          create: cart.items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: getEffectiveProductPrice(item.product)
          }))
        }
      },
      include: {
        items: {include: {product: true}}
      }
    })

      await tx.cartItem.deleteMany({where: {cart_id: cart.id}})
      return order
    })
  } catch (error) {
    if (error?.code === 'P2002') {
      const raced_order = await prisma.order.findUnique({
        where: {idempotency_key: customer.idempotency_key},
        include: {items: {include: {product: true}}}
      })
      if (raced_order) return idempotentOrderResult(request, raced_order)
    }
    throw error
  }

  const result = {
    order: {
      ...withoutOrderSecret(created_order),
      ...(raw_order_token ? {access_token: raw_order_token} : {})
    },
    guest_token,
    should_set_guest_cookie
  }
  mail_service.sendOrderCreatedEmails(created_order).catch(error => console.error('Не удалось отправить уведомление о заказе', error))
  return result
}

const getMyOrders = async request => {
  if (!request.user?.id) {
    throw ApiError.unauthorized('Только для авторизованных пользователей')
  }

  const orders = await prisma.order.findMany({
    where: {user_id: request.user.id},
    include: {
      items: {include: {product: true}}
    },
    orderBy: {created_at: 'desc'}
  })

  return orders.map(withoutOrderSecret)
}

const getGuestOrders = async request => {
  if (request.user?.id) {
    throw ApiError.badRequest('Для авторизованного пользователя используйте /orders/my')
  }

  const guest_token = request.cookies?.guest_token
  if (!guest_token) return []

  const orders = await prisma.order.findMany({
    where: {guest_token},
    include: {
      items: {include: {product: true}}
    },
    orderBy: {created_at: 'desc'}
  })

  return orders.map(withoutOrderSecret)
}

const findOrderById = async order_id => {
  const numeric_order_id = parsePositiveInteger(order_id, 'id заказа')
  const order = await prisma.order.findUnique({
    where: {id: numeric_order_id},
    include: {
      items: {include: {product: true}}
    }
  })

  if (!order) throw ApiError.notFound('Заказ не найден')
  return order
}

const getOrderById = async (request, order_id) => {
  const order = await findOrderById(order_id)

  if (request.user?.id && order.user_id === request.user.id) {
    return withoutOrderSecret(order)
  }

  const guest_token = request.cookies?.guest_token
  if (guest_token && order.guest_token && guest_token === order.guest_token) {
    return withoutOrderSecret(order)
  }

  const header_token = request.headers?.['x-order-access-token']
  const token = header_token
  if (token) {
    const token_matches = hashToken(token) === order.access_token || token === order.access_token
    if (token_matches) return withoutOrderSecret(order)
  }

  throw ApiError.forbidden('Нет доступа к заказу')
}

const getAdminOrderById = async (request, order_id) => {
  const id=parsePositiveInteger(order_id,'id заказа')
  const order=await prisma.order.findUnique({where:{id},include:{items:{include:{product:true}},user:{select:{id:true,email:true,role:true}},assigned_manager:{select:{id:true,email:true,role:true,is_active:true}},credited_manager:{select:{id:true,email:true,role:true,is_active:true}}}})
  if(!order) throw ApiError.notFound('Заказ не найден')
  ensureManagerCanHandleOrder(request,order)
  return withoutAdminOrderSecret(order)
}

const requestOwnsOrder = (request, order) => {
  if (request.user?.id && order.user_id === request.user.id) return true
  if (request.cookies?.guest_token && order.guest_token && request.cookies.guest_token === order.guest_token) return true
  const token=request.headers?.['x-order-access-token'] || ''
  return Boolean(token && (hashToken(token)===order.access_token || token===order.access_token))
}

const ensureManagerCanHandleOrder = (request, order) => {
  if (request.user?.role !== 'manager') return true
  if (order.assigned_manager_id && order.assigned_manager_id !== request.user.id) {
    throw ApiError.forbidden('Этот заказ уже закреплён за другим менеджером')
  }
  return true
}


const updateOrderStatus = async (request, order_id, status) => {
  const numeric_order_id = parsePositiveInteger(order_id, 'id заказа')
  if (!isValidOrderStatus(status)) throw ApiError.badRequest('Некорректный статус заказа')

  const updated_order = await prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({where:{id:numeric_order_id},include:{items:true}})
    if (!order) throw ApiError.notFound('Заказ не найден')
    ensureManagerCanHandleOrder(request,order)
    if (!canChangeOrderStatus(order.status,status)) throw ApiError.badRequest(`Нельзя изменить статус с «${getOrderStatusLabel(order.status)}» на «${getOrderStatusLabel(status)}»`)

    let assigned_manager_id=order.assigned_manager_id
    const is_manager=request.user?.role==='manager'
    if(!assigned_manager_id && is_manager) assigned_manager_id=request.user.id
    const data={status}
    if(assigned_manager_id!==order.assigned_manager_id){data.assigned_manager_id=assigned_manager_id;data.assigned_at=new Date()}
    if(status==='completed'){
      data.completed_at=new Date()
      data.credited_manager_id=resolveOrderCreditManagerId({assigned_manager_id,actor:request.user})
    }
    if(status==='cancelled') data.cancelled_at=new Date()

    const transition=await tx.order.updateMany({where:{id:numeric_order_id,status:order.status},data})
    if(transition.count!==1) throw ApiError.badRequest('Статус заказа уже изменился. Обновите страницу')
    if(status==='cancelled') for(const item of order.items) await tx.product.update({where:{id:item.product_id},data:{stock:{increment:item.quantity}}})
    await tx.orderStatusHistory.create({data:{order_id:order.id,from_status:order.status,to_status:status,changed_by:request.user?.id||null,change_source:'staff'}})
    return tx.order.findUnique({where:{id:numeric_order_id},include:{items:{include:{product:true}},user:{select:{order_notifications_enabled:true}},assigned_manager:{select:{id:true,email:true,role:true}},credited_manager:{select:{id:true,email:true,role:true}}}})
  })
  await writeAuditLog({request,action:auditActions.ORDER_STATUS,entity_type:'order',entity_id:numeric_order_id,entity_label:`Заказ №${numeric_order_id}`,details:{to_status:status,assigned_manager_id:updated_order.assigned_manager_id||null,credited_manager_id:updated_order.credited_manager_id||null}})
  const should_send_status_email=!updated_order.user_id||updated_order.user?.order_notifications_enabled!==false
  if(should_send_status_email) mail_service.sendOrderStatusEmail(updated_order).catch(error=>console.error(`Не удалось отправить уведомление о статусе заказа №${updated_order.id}`,error))
  const {user:_user_preferences,...safe}=updated_order
  return withoutOrderSecret(safe)
}

const assignOrder = async (request, order_id, manager_id) => {
  const id=parsePositiveInteger(order_id,'id заказа')
  const order=await prisma.order.findUnique({where:{id},include:{assigned_manager:{select:{id:true,email:true}}}})
  if(!order) throw ApiError.notFound('Заказ не найден')
  if(['completed','cancelled'].includes(order.status)) throw ApiError.badRequest('Завершённый или отменённый заказ нельзя переназначить')
  let targetId=manager_id===null||manager_id===''?null:parsePositiveInteger(manager_id,'manager_id')
  if(request.user.role==='manager'){
    if(order.assigned_manager_id && order.assigned_manager_id!==request.user.id) {
      throw ApiError.forbidden('Этот заказ уже закреплён за другим менеджером')
    }
    if(targetId===null) targetId=request.user.id
    if(targetId!==request.user.id) throw ApiError.forbidden('Менеджер может назначить заказ только на себя')
  }
  let manager=null
  if(targetId){
    manager=await prisma.user.findFirst({where:{id:targetId,role:'manager',is_active:true,can_manage_orders:true},select:{id:true,email:true}})
    if(!manager) throw ApiError.badRequest('Менеджер недоступен или не имеет права обрабатывать заказы')
  } else if(request.user.role!=='admin') throw ApiError.forbidden('Снять ответственного может только администратор')
  const assignment_where=request.user.role==='manager'
    ? {id,status:{notIn:['completed','cancelled']},OR:[{assigned_manager_id:null},{assigned_manager_id:request.user.id}]}
    : {id,status:{notIn:['completed','cancelled']}}
  const changed=await prisma.order.updateMany({where:assignment_where,data:{assigned_manager_id:targetId,assigned_at:targetId?new Date():null}})
  if(changed.count!==1) {
    if(request.user.role==='manager') throw ApiError.forbidden('Заказ уже закреплён за другим менеджером или недоступен')
    throw ApiError.badRequest('Заказ уже завершён или отменён. Обновите страницу')
  }
  const updated=await prisma.order.findUnique({where:{id},include:{items:{include:{product:true}},assigned_manager:{select:{id:true,email:true,role:true,is_active:true}},credited_manager:{select:{id:true,email:true,role:true,is_active:true}}}})
  await writeAuditLog({request,action:auditActions.ORDER_ASSIGN,entity_type:'order',entity_id:id,entity_label:`Заказ №${id}`,details:{from:order.assigned_manager_id||null,from_manager_email:order.assigned_manager?.email||null,to:targetId,to_manager_email:manager?.email||null}})
  return withoutAdminOrderSecret(updated)
}

const cancelCustomerOrder = async (request, order_id, {restore_to_cart=true}={}) => {
  const id=parsePositiveInteger(order_id,'id заказа')
  const existing=await prisma.order.findUnique({where:{id},include:{items:true}})
  if(!existing) throw ApiError.notFound('Заказ не найден')
  if(!requestOwnsOrder(request,existing)) throw ApiError.forbidden('Нет доступа к заказу')
  if(!canCustomerCancelOrder(existing)) throw ApiError.badRequest('Самостоятельно отменить можно только новый заказ, пока его не начали обрабатывать')
  const is_user=Boolean(request.user?.id)
  const guest_token=is_user?null:(existing.guest_token||request.cookies?.guest_token||generateGuestToken())
  const should_set_guest_cookie=!is_user && request.cookies?.guest_token!==guest_token
  const skipped=[]
  const result=await prisma.$transaction(async tx=>{
    const transition=await tx.order.updateMany({where:{id,status:'pending',assigned_manager_id:null},data:{status:'cancelled',cancelled_at:new Date(),cancelled_by_customer:true}})
    if(transition.count!==1) throw ApiError.badRequest('Заказ уже изменился. Обновите страницу')
    for(const item of existing.items) await tx.product.update({where:{id:item.product_id},data:{stock:{increment:item.quantity}}})
    await tx.orderStatusHistory.create({data:{order_id:id,from_status:'pending',to_status:'cancelled',changed_by:request.user?.id||null,change_source:'customer'}})
    if(restore_to_cart){
      const cart=is_user
        ? await tx.cart.upsert({where:{user_id:request.user.id},update:{},create:{user_id:request.user.id}})
        : await tx.cart.upsert({where:{guest_token},update:{},create:{guest_token}})
      for(const item of existing.items){
        const product=await tx.product.findFirst({where:{id:item.product_id,is_deleted:false}})
        if(!product||product.stock<=0){skipped.push(item.product_id);continue}
        const current=await tx.cartItem.findUnique({where:{cart_id_product_id:{cart_id:cart.id,product_id:item.product_id}}})
        const quantity=Math.min((current?.quantity||0)+item.quantity,product.stock)
        if(quantity<=0){skipped.push(item.product_id);continue}
        if(current) await tx.cartItem.update({where:{id:current.id},data:{quantity}})
        else await tx.cartItem.create({data:{cart_id:cart.id,product_id:item.product_id,quantity}})
      }
    }
    return tx.order.findUnique({where:{id},include:{items:{include:{product:true}}}})
  })
  await writeAuditLog({request,action:auditActions.ORDER_CUSTOMER_CANCEL,entity_type:'order',entity_id:id,entity_label:`Заказ №${id}`,details:{restore_to_cart,skipped}})
  mail_service.sendOrderStatusEmail(result).catch(error=>console.error(`Не удалось отправить уведомление об отмене заказа №${id}`,error))
  return {order:withoutOrderSecret(result),restored_to_cart:restore_to_cart,skipped_product_ids:skipped,guest_token,should_set_guest_cookie}
}

const getAvailableStatusTransitions = async (request, order_id) => {
  const numeric_order_id = parsePositiveInteger(order_id, 'id заказа')
  const order = await prisma.order.findUnique({where: {id: numeric_order_id}})

  if (!order) throw ApiError.notFound('Заказ не найден')
  ensureManagerCanHandleOrder(request,order)

  return {
    current_status: order.status,
    available_next_statuses: allowed_order_statuses.filter(status =>
      canChangeOrderStatus(order.status, status)
    )
  }
}

const parseDateFilter = (value, field_name) => {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw ApiError.badRequest(`${field_name} содержит некорректную дату`)
  }
  return date
}

const getAdminOrders = async (request, {
  page = 1,
  limit = 20,
  status,
  email,
  sort_by = 'created_at',
  sort_order = 'desc',
  date_from,
  date_to,
  min_total,
  max_total,
  assigned_manager_id,
  credited_manager_id
}) => {
  if (!Number.isSafeInteger(page) || page < 1) throw ApiError.badRequest('Некорректный page')
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw ApiError.badRequest('Некорректный limit')
  if (!allowed_admin_order_sort_fields.includes(sort_by)) throw ApiError.badRequest('Некорректное поле сортировки')
  if (!allowed_sort_orders.includes(sort_order)) throw ApiError.badRequest('Некорректный порядок сортировки')
  if (status && !isValidOrderStatus(status)) throw ApiError.badRequest('Некорректный статус заказа')

  const from = parseDateFilter(date_from, 'date_from')
  const to = parseDateFilter(date_to, 'date_to')

  if (from && to && from > to) throw ApiError.badRequest('date_from не может быть позже date_to')
  if (min_total !== undefined && (!Number.isFinite(min_total) || min_total < 0)) throw ApiError.badRequest('Некорректный min_total')
  if (max_total !== undefined && (!Number.isFinite(max_total) || max_total < 0)) throw ApiError.badRequest('Некорректный max_total')
  if (min_total !== undefined && max_total !== undefined && min_total > max_total) throw ApiError.badRequest('min_total не может быть больше max_total')

  const skip = (page - 1) * limit
  const staff_scope = request?.user?.role === 'manager'
    ? {OR: [{assigned_manager_id: null}, {assigned_manager_id: request.user.id}]}
    : {}
  const where = {
    ...staff_scope,
    ...(status ? {status} : {}),
    ...(String(assigned_manager_id||'')==='0'?{assigned_manager_id:null}:(assigned_manager_id?{assigned_manager_id:parsePositiveInteger(assigned_manager_id,'manager_id')}:{})),
    ...(String(credited_manager_id||'')==='0'?{credited_manager_id:null}:(credited_manager_id?{credited_manager_id:parsePositiveInteger(credited_manager_id,'credited_manager_id')}:{})),
    ...(email ? {email: {contains: email, mode:'insensitive'}} : {}),
    ...((from || to) ? {created_at: {...(from ? {gte: from} : {}), ...(to ? {lte: to} : {})}} : {}),
    ...((min_total !== undefined || max_total !== undefined)
      ? {total_price: {...(min_total !== undefined ? {gte: min_total} : {}), ...(max_total !== undefined ? {lte: max_total} : {})}}
      : {})
  }

  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        items: {include: {product: true}},
        user: {select: {id: true, email: true, role: true}},
        assigned_manager:{select:{id:true,email:true,role:true,is_active:true}},
        credited_manager:{select:{id:true,email:true,role:true,is_active:true}}
      },
      orderBy: {[sort_by]: sort_order},
      skip,
      take: limit
    }),
    prisma.order.count({where})
  ])

  return {
    items: items.map(withoutAdminOrderSecret),
    meta: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  }
}

const updateAdminOrder = async (request, order_id, changes = {}) => {
  const numeric_order_id = parsePositiveInteger(order_id, 'id заказа')
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw ApiError.badRequest('Некорректные данные заказа')
  }

  const allowed_fields = new Set(['email', 'name', 'phone', 'address', 'postal_code', 'comment', 'delivery_method', 'delivery_price', 'admin_note'])
  const unknown_fields = Object.keys(changes).filter(key => !allowed_fields.has(key))
  if (unknown_fields.length) {
    throw ApiError.badRequest(`Нельзя изменять поля: ${unknown_fields.join(', ')}`)
  }

  const current_order = await prisma.order.findUnique({where: {id: numeric_order_id}})
  if (!current_order) throw ApiError.notFound('Заказ не найден')
  ensureManagerCanHandleOrder(request,current_order)

  const customer_fields = ['email', 'name', 'phone', 'address', 'postal_code', 'comment', 'delivery_method', 'delivery_price']
  const changes_customer_data = customer_fields.some(key => Object.prototype.hasOwnProperty.call(changes, key))
  if (changes_customer_data && ['shipped', 'delivered', 'completed', 'cancelled'].includes(current_order.status)) {
    throw ApiError.badRequest('Данные покупателя нельзя менять после отправки, доставки, завершения или отмены заказа')
  }

  const data = {}

  if (Object.prototype.hasOwnProperty.call(changes, 'email')) data.email = normalizeEmail(changes.email)
  if (Object.prototype.hasOwnProperty.call(changes, 'name')) data.name = requireTrimmedString(changes.name, 'Имя', {max_length: 120})
  if (Object.prototype.hasOwnProperty.call(changes, 'phone')) data.phone = requireTrimmedString(changes.phone, 'Телефон', {max_length: 50})

  const delivery_method = Object.prototype.hasOwnProperty.call(changes, 'delivery_method') ? changes.delivery_method : current_order.delivery_method
  if (!delivery_methods.includes(delivery_method)) throw ApiError.badRequest('Некорректный способ доставки')
  if (Object.prototype.hasOwnProperty.call(changes, 'delivery_method')) data.delivery_method = delivery_method

  if (delivery_method === 'pickup') {
    if (Object.prototype.hasOwnProperty.call(changes, 'delivery_method') || Object.prototype.hasOwnProperty.call(changes, 'address')) data.address = 'Самовывоз'
    if (Object.prototype.hasOwnProperty.call(changes, 'delivery_method') || Object.prototype.hasOwnProperty.call(changes, 'postal_code')) data.postal_code = null
  } else {
    if (Object.prototype.hasOwnProperty.call(changes, 'address')) data.address = requireTrimmedString(changes.address, 'Адрес', {max_length: 500})
    else if (current_order.delivery_method === 'pickup' && Object.prototype.hasOwnProperty.call(changes, 'delivery_method')) {
      throw ApiError.badRequest('Укажите адрес, город, пункт выдачи или пожелания по доставке')
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'postal_code')) {
      data.postal_code = typeof changes.postal_code === 'string' ? changes.postal_code.trim().slice(0, 20) || null : null
    }
  }

  if (Object.prototype.hasOwnProperty.call(changes, 'comment')) {
    if (changes.comment !== null && changes.comment !== undefined && typeof changes.comment !== 'string') throw ApiError.badRequest('Комментарий должен быть текстом')
    const comment = typeof changes.comment === 'string' ? changes.comment.trim() : ''
    if (comment.length > 1000) throw ApiError.badRequest('Комментарий слишком длинный')
    data.comment = comment || null
  }

  if (Object.prototype.hasOwnProperty.call(changes, 'admin_note')) {
    if (changes.admin_note !== null && changes.admin_note !== undefined && typeof changes.admin_note !== 'string') throw ApiError.badRequest('Внутренняя заметка должна быть текстом')
    const admin_note = typeof changes.admin_note === 'string' ? changes.admin_note.trim() : ''
    if (admin_note.length > 2000) throw ApiError.badRequest('Внутренняя заметка слишком длинная')
    data.admin_note = admin_note || null
  }

  const delivery_method_changed = Object.prototype.hasOwnProperty.call(changes, 'delivery_method')
  const delivery_price_changed = Object.prototype.hasOwnProperty.call(changes, 'delivery_price')
  if (delivery_method === 'pickup') {
    if (delivery_method_changed || delivery_price_changed) {
      data.delivery_price = 0
      data.delivery_price_confirmed = true
    }
  } else if (delivery_price_changed) {
    const raw_delivery_price = changes.delivery_price
    if (raw_delivery_price === null || raw_delivery_price === undefined || raw_delivery_price === '') {
      data.delivery_price = 0
      data.delivery_price_confirmed = false
    } else {
      const delivery_price = Number(raw_delivery_price)
      if (!Number.isFinite(delivery_price) || delivery_price < 0 || delivery_price > 1_000_000) throw ApiError.badRequest('Некорректная стоимость доставки')
      data.delivery_price = roundMoney(delivery_price)
      data.delivery_price_confirmed = true
    }
  } else if (delivery_method_changed) {
    data.delivery_price = calculateDeliveryPrice(Number(current_order.subtotal), delivery_method)
    data.delivery_price_confirmed = false
  }

  if (delivery_method_changed || delivery_price_changed) {
    const resolved_delivery_price = Number(data.delivery_price ?? current_order.delivery_price ?? 0)
    data.total_price = roundMoney(Number(current_order.subtotal) - Number(current_order.discount_amount||0) + resolved_delivery_price)
  }

  const is_manager = request.user?.role === 'manager'
  if (!current_order.assigned_manager_id && is_manager) { data.assigned_manager_id=request.user.id; data.assigned_at=new Date() }
  if (!Object.keys(data).length) return await getAdminOrderById(request,numeric_order_id)

  const include = {items:{include:{product:true}},assigned_manager:{select:{id:true,email:true,role:true,is_active:true}},credited_manager:{select:{id:true,email:true,role:true,is_active:true}}}
  const order = is_manager
    ? await prisma.$transaction(async tx => {
        const changed = await tx.order.updateMany({
          where: {id:numeric_order_id,OR:[{assigned_manager_id:null},{assigned_manager_id:request.user.id}]},
          data
        })
        if (changed.count !== 1) throw ApiError.forbidden('Заказ уже назначен другому менеджеру')
        return tx.order.findUnique({where:{id:numeric_order_id},include})
      })
    : await prisma.order.update({where:{id:numeric_order_id},data,include})
  await writeAuditLog({request,action:auditActions.ORDER_UPDATE,entity_type:'order',entity_id:numeric_order_id,entity_label:`Заказ №${numeric_order_id}`,details:{changed_fields:Object.keys(changes)}})
  return withoutAdminOrderSecret(order)
}

const updateAdminOrderNote = async (request, order_id, admin_note) => updateAdminOrder(request, order_id, {admin_note})

const getOrderHistory = async (request, order_id) => {
  const numeric_order_id = parsePositiveInteger(order_id, 'id заказа')
  const order=await prisma.order.findUnique({where:{id:numeric_order_id},select:{id:true,assigned_manager_id:true}})
  if(!order)throw ApiError.notFound('Заказ не найден')
  ensureManagerCanHandleOrder(request,order)
  return prisma.orderStatusHistory.findMany({
    where: {order_id: numeric_order_id},
    include:{changed_by_user:{select:{id:true,email:true,role:true}}},
    orderBy: {created_at: 'desc'}
  })
}

const getOrderActivity = async (request, order_id) => {
  const numeric_order_id = parsePositiveInteger(order_id, 'id заказа')
  const order=await prisma.order.findUnique({where:{id:numeric_order_id},select:{id:true,assigned_manager_id:true}})
  if(!order) throw ApiError.notFound('Заказ не найден')
  ensureManagerCanHandleOrder(request,order)
  return prisma.auditLog.findMany({
    where:{entity_type:'order',entity_id:numeric_order_id},
    include:{actor:{select:{id:true,email:true,role:true}}},
    orderBy:{created_at:'desc'},
    take:100
  })
}

export default {
  createOrderFromCart,
  getMyOrders,
  getGuestOrders,
  getOrderById,
  getAdminOrderById,
  updateOrderStatus,
  assignOrder,
  cancelCustomerOrder,
  updateAdminOrder,
  updateAdminOrderNote,
  getAvailableStatusTransitions,
  getAdminOrders,
  getOrderHistory,
  getOrderActivity
}
