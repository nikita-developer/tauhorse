import prisma from '../config/prisma.js'
import {ApiError} from './api-error'
import {verifyAccessToken} from './jwt'

export const createRequestContext = event => {
  const auth_header = getHeader(event, 'authorization') || ''
  let user = null
  let auth_error = false

  if (auth_header) {
    const [bearer, token] = auth_header.split(' ')

    if (bearer === 'Bearer' && token) {
      try {
        user = verifyAccessToken(token)
      } catch {
        user = null
        auth_error = true
      }
    } else {
      auth_error = true
    }
  }

  return {
    user,
    auth_error,
    cookies: parseCookies(event),
    query: getQuery(event),
    headers: {
      'user-agent': getHeader(event, 'user-agent') || null,
      'x-order-access-token': getHeader(event, 'x-order-access-token') || null
    },
    ip: getRequestIP(event, {xForwardedFor: true}) || null
  }
}

const validateActiveSession = async request => {
  if (!request.user?.id) return request

  const session_id = Number(request.user.sid)
  if (!Number.isSafeInteger(session_id) || session_id <= 0) {
    throw ApiError.unauthorized('Сессия access token недействительна')
  }

  const session = await prisma.refreshToken.findFirst({
    where: {
      id: session_id,
      user_id: request.user.id,
      revoked_at: null,
      expires_at: {gt: new Date()}
    },
    select: {id: true, user: {select:{is_active:true}}}
  })

  if (!session) {
    throw ApiError.unauthorized('Сессия завершена')
  }
  if (session.user?.is_active === false) throw ApiError.forbidden('Доступ к аккаунту отключён')

  return request
}

export const optionalAuth = async event => {
  const request = createRequestContext(event)

  if (request.auth_error) {
    throw ApiError.unauthorized('Токен недействителен или истёк')
  }

  return await validateActiveSession(request)
}

export const requireAuth = async event => {
  const request = await optionalAuth(event)

  if (!request.user?.id) {
    throw ApiError.unauthorized('Токен не передан или недействителен')
  }

  return request
}

export const requireAdmin = async event => {
  const request = await requireAuth(event)
  const user = await prisma.user.findUnique({
    where: {id: request.user.id},
    select: {id:true,email:true,role:true,is_active:true,can_manage_orders:true,can_manage_catalog:true,can_manage_discounts:true,can_manage_campaigns:true}
  })

  if (!user) throw ApiError.unauthorized('Пользователь не найден')
  if (user.is_active === false) throw ApiError.forbidden('Доступ отключён')
  if (user.role !== 'admin') throw ApiError.forbidden('Доступ запрещён')

  request.user = {...user, sid: request.user.sid}
  return request
}

export const sendJsonError = error => {
  const status = error?.status || error?.statusCode || 500
  const is_expected = error instanceof ApiError || status < 500
  const message = is_expected
    ? (error?.message || error?.statusMessage || 'Ошибка запроса')
    : 'Внутренняя ошибка сервера'

  if (!is_expected) {
    console.error(error)
  }

  throw createError({statusCode: status, statusMessage: message, data: {message}})
}
