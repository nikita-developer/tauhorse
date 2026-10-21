import bcrypt from 'bcrypt'
import prisma from '../config/prisma.js'
import {
  generateAccessToken,
  generateRefreshToken,
  getTokenExpirationDate,
  verifyRefreshToken
} from '../utils/jwt.js'
import {ApiError} from '../utils/api-error.js'
import mail_service from './mail.service.js'
import {generatePasswordResetToken} from '../utils/password-reset.js'
import {generateEmailVerificationToken} from '../utils/email-verification.js'
import {hashToken} from '../utils/hash.js'
import {normalizeEmail, validatePassword} from '../utils/validation.js'

const password_reset_token_ttl_ms = 15 * 60 * 1000
const email_verification_token_ttl_ms = 24 * 60 * 60 * 1000

const toPublicUser = user => ({
  id: user.id,
  email: user.email,
  role: user.role,
  order_notifications_enabled: user.order_notifications_enabled !== false,
  email_verified: Boolean(user.email_verified_at),
  is_active: user.is_active !== false,
  can_manage_orders: user.role === 'admin' || user.can_manage_orders === true,
  can_manage_catalog: user.role === 'admin' || user.can_manage_catalog === true,
  can_manage_discounts: user.role === 'admin' || user.can_manage_discounts === true,
  can_manage_campaigns: user.role === 'admin' || user.can_manage_campaigns === true
})

const createTokenPayload = user => ({
  id: user.id,
  email: user.email,
  role: user.role
})

const createSessionTokens = async ({user, user_agent, ip_address}) => {
  const payload = createTokenPayload(user)
  const refresh_token = generateRefreshToken(payload)
  const session = await saveRefreshToken(prisma, {
    user_id: user.id,
    refresh_token,
    user_agent,
    ip_address
  })

  return {
    access_token: generateAccessToken({...payload, sid: session.id}),
    refresh_token
  }
}

const saveRefreshToken = async (db, {
  user_id,
  refresh_token,
  user_agent = null,
  ip_address = null
}) => {
  return db.refreshToken.create({
    data: {
      token_hash: hashToken(refresh_token),
      user_id,
      expires_at: getTokenExpirationDate(refresh_token),
      user_agent,
      ip_address
    }
  })
}

const createEmailVerification = async user => {
  await prisma.emailVerificationToken.deleteMany({
    where: {user_id: user.id, used_at: null}
  })

  const raw_token = generateEmailVerificationToken()
  await prisma.emailVerificationToken.create({
    data: {
      token: hashToken(raw_token),
      user_id: user.id,
      expires_at: new Date(Date.now() + email_verification_token_ttl_ms)
    }
  })

  const app_url = String(useRuntimeConfig().public.appUrl || 'http://localhost:3000').replace(/\/$/, '')
  const verification_link = `${app_url}/verify-email#token=${encodeURIComponent(raw_token)}`

  await mail_service.sendEmailVerificationEmail({
    email: user.email,
    verification_link
  })
}

const register = async ({email, password}) => {
  const normalized_email = normalizeEmail(email)
  validatePassword(password)

  const existing_user = await prisma.user.findUnique({
    where: {email: normalized_email}
  })

  if (existing_user) {
    if (!existing_user.email_verified_at) {
      const same_password = await bcrypt.compare(password, existing_user.password)
      if (!same_password) throw ApiError.badRequest('Пользователь уже существует')

      try {
        await createEmailVerification(existing_user)
      } catch (error) {
        console.error('Не удалось повторно отправить подтверждение email', error)
        throw new ApiError(503, 'Не удалось отправить письмо подтверждения. Попробуйте ещё раз позже.')
      }
      return {user: toPublicUser(existing_user), verification_required: true}
    }
    throw ApiError.badRequest('Пользователь уже существует')
  }

  const hashed_password = await bcrypt.hash(password, 12)
  let user
  try {
    user = await prisma.user.create({
      data: {
        email: normalized_email,
        password: hashed_password,
        email_verified_at: null
      }
    })
  } catch (error) {
    if (error?.code === 'P2002') throw ApiError.badRequest('Пользователь уже существует')
    throw error
  }

  try {
    await createEmailVerification(user)
  } catch (error) {
    console.error('Не удалось отправить письмо подтверждения email', error)
    throw new ApiError(503, 'Аккаунт создан, но письмо не удалось отправить. Попробуйте отправить подтверждение ещё раз.')
  }

  return {
    user: toPublicUser(user),
    verification_required: true
  }
}

const login = async ({email, password, user_agent, ip_address}) => {
  const normalized_email = normalizeEmail(email)

  if (typeof password !== 'string' || !password) {
    throw ApiError.badRequest('Неверный email или пароль')
  }

  const user = await prisma.user.findUnique({
    where: {email: normalized_email}
  })

  if (!user) {
    throw ApiError.badRequest('Неверный email или пароль')
  }

  const is_valid = await bcrypt.compare(password, user.password)

  if (!is_valid) {
    throw ApiError.badRequest('Неверный email или пароль')
  }

  if (!user.email_verified_at) {
    throw ApiError.forbidden('Сначала подтвердите email. Мы отправили ссылку при регистрации.')
  }
  if (user.is_active === false) throw ApiError.forbidden('Доступ к аккаунту отключён администратором')

  const {access_token, refresh_token} = await createSessionTokens({
    user,
    user_agent,
    ip_address
  })

  return {
    user: toPublicUser(user),
    access_token,
    refresh_token
  }
}

const forgotPassword = async email => {
  const normalized_email = normalizeEmail(email)

  const user = await prisma.user.findUnique({
    where: {email: normalized_email}
  })

  if (!user || !user.email_verified_at) {
    return true
  }

  await prisma.passwordResetToken.deleteMany({
    where: {
      user_id: user.id,
      used_at: null
    }
  })

  const reset_token = generatePasswordResetToken()

  // Store only the SHA-256 hash. Older rows may still contain a legacy raw token.
  await prisma.passwordResetToken.create({
    data: {
      token: hashToken(reset_token),
      user_id: user.id,
      expires_at: new Date(Date.now() + password_reset_token_ttl_ms)
    }
  })

  const app_url = String(useRuntimeConfig().public.appUrl || 'http://localhost:3000').replace(/\/$/, '')
  const reset_link = `${app_url}/reset-password#token=${encodeURIComponent(reset_token)}`

  try {
    await mail_service.sendPasswordResetEmail({
      email: user.email,
      reset_link
    })
  } catch (error) {
    // Не выдаём существование аккаунта по различиям ответа при сбое SMTP.
    console.error('Не удалось отправить письмо сброса пароля', error)
  }

  return true
}

const verifyEmail = async token => {
  if (typeof token !== 'string' || !token) {
    throw ApiError.badRequest('Некорректная ссылка подтверждения')
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: {token: hashToken(token)}
  })

  if (!record || record.used_at || record.expires_at < new Date()) {
    throw ApiError.badRequest('Ссылка подтверждения недействительна или истекла')
  }

  await prisma.$transaction(async tx => {
    const claimed = await tx.emailVerificationToken.updateMany({
      where: {id: record.id, used_at: null, expires_at: {gt: new Date()}},
      data: {used_at: new Date()}
    })
    if (claimed.count !== 1) throw ApiError.badRequest('Ссылка подтверждения уже использована или истекла')
    await tx.user.update({where: {id: record.user_id}, data: {email_verified_at: new Date()}})
    await tx.emailVerificationToken.deleteMany({where: {user_id: record.user_id, id: {not: record.id}}})
  })

  return true
}

const resendVerification = async email => {
  const normalized_email = normalizeEmail(email)
  const user = await prisma.user.findUnique({where: {email: normalized_email}})

  if (!user || user.email_verified_at) return true

  try {
    await createEmailVerification(user)
  } catch (error) {
    console.error('Не удалось повторно отправить подтверждение email', error)
  }

  return true
}

const resetPassword = async (token, password) => {
  if (typeof token !== 'string' || !token) {
    throw ApiError.badRequest('Невалидный токен сброса')
  }

  validatePassword(password)

  const token_hash = hashToken(token)
  const reset_record = await prisma.passwordResetToken.findFirst({
    where: {
      OR: [
        {token: token_hash},
        // Backward compatibility for tokens created before hashing was introduced.
        {token}
      ]
    }
  })

  if (!reset_record) {
    throw ApiError.badRequest('Невалидный токен сброса')
  }

  if (reset_record.used_at) {
    throw ApiError.badRequest('Токен уже использован')
  }

  if (reset_record.expires_at < new Date()) {
    throw ApiError.badRequest('Токен сброса истёк')
  }

  const hashed_password = await bcrypt.hash(password, 12)

  await prisma.$transaction(async tx => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: {id: reset_record.id, used_at: null, expires_at: {gt: new Date()}},
      data: {used_at: new Date()}
    })
    if (claimed.count !== 1) throw ApiError.badRequest('Токен сброса уже использован или истёк')
    await tx.user.update({where: {id: reset_record.user_id}, data: {password: hashed_password}})
    await tx.passwordResetToken.deleteMany({where: {user_id: reset_record.user_id, id: {not: reset_record.id}}})
    await tx.refreshToken.deleteMany({where: {user_id: reset_record.user_id}})
  })

  return true
}

const refresh = async (refresh_token, {user_agent = null, ip_address = null} = {}) => {
  if (!refresh_token) {
    throw ApiError.unauthorized('Нет refresh token')
  }

  let decoded

  try {
    decoded = verifyRefreshToken(refresh_token)
  } catch {
    throw ApiError.unauthorized('Невалидный refresh token')
  }

  const token_hash = hashToken(refresh_token)
  const stored_token = await prisma.refreshToken.findUnique({
    where: {token_hash}
  })

  if (!stored_token || stored_token.revoked_at) {
    throw ApiError.unauthorized('Refresh token не найден или отозван')
  }

  if (stored_token.expires_at < new Date()) {
    await prisma.refreshToken.deleteMany({where: {id: stored_token.id}})
    throw ApiError.unauthorized('Refresh token истёк')
  }

  if (stored_token.user_id !== decoded.id) {
    await prisma.refreshToken.deleteMany({where: {id: stored_token.id}})
    throw ApiError.unauthorized('Refresh token повреждён')
  }

  const user = await prisma.user.findUnique({
    where: {id: stored_token.user_id}
  })

  if (!user) {
    throw ApiError.unauthorized('Пользователь не найден')
  }
  if (user.is_active === false) {
    await prisma.refreshToken.deleteMany({where:{user_id:user.id}})
    throw ApiError.forbidden('Доступ к аккаунту отключён администратором')
  }

  const payload = createTokenPayload(user)
  const next_refresh_token = generateRefreshToken(payload)
  const next_pair = {
    access_token: generateAccessToken({...payload, sid: stored_token.id}),
    refresh_token: next_refresh_token
  }

  // Rotate in-place so session id / original created_at stay stable in the devices UI.
  const rotated = await prisma.refreshToken.updateMany({
    where: {
      id: stored_token.id,
      token_hash
    },
    data: {
      token_hash: hashToken(next_pair.refresh_token),
      expires_at: getTokenExpirationDate(next_pair.refresh_token),
      user_agent: user_agent ?? stored_token.user_agent,
      ip_address: ip_address ?? stored_token.ip_address
    }
  })

  if (rotated.count !== 1) {
    throw ApiError.unauthorized('Refresh token уже использован')
  }

  return next_pair
}

const logout = async refresh_token => {
  if (!refresh_token) return true

  await prisma.refreshToken.deleteMany({
    where: {token_hash: hashToken(refresh_token)}
  })

  return true
}

const getMe = async user_id => {
  const user = await prisma.user.findUnique({
    where: {id: user_id},
    select: {
      id: true,
      email: true,
      role: true,
      created_at: true,
      order_notifications_enabled: true,
      marketing_emails_enabled: true,
      email_verified_at: true,
      is_active: true,
      can_manage_orders: true,
      can_manage_catalog: true,
      can_manage_discounts: true,
      can_manage_campaigns: true
    }
  })

  if (!user) throw ApiError.notFound('Пользователь не найден')
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    order_notifications_enabled: user.order_notifications_enabled !== false,
    marketing_emails_enabled: user.marketing_emails_enabled === true,
    email_verified: Boolean(user.email_verified_at),
    is_active: user.is_active !== false,
    can_manage_orders: user.role === 'admin' || user.can_manage_orders === true,
    can_manage_catalog: user.role === 'admin' || user.can_manage_catalog === true,
    can_manage_discounts: user.role === 'admin' || user.can_manage_discounts === true,
    can_manage_campaigns: user.role === 'admin' || user.can_manage_campaigns === true
  }
}


const updatePreferences = async (user_id, changes = {}) => {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw ApiError.badRequest('Некорректные настройки')
  }

  const allowed_fields = new Set(['order_notifications_enabled', 'marketing_emails_enabled'])
  const unknown_fields = Object.keys(changes).filter(key => !allowed_fields.has(key))
  if (unknown_fields.length) {
    throw ApiError.badRequest(`Неизвестные настройки: ${unknown_fields.join(', ')}`)
  }

  for (const key of Object.keys(changes)) {
    if (typeof changes[key] !== 'boolean') throw ApiError.badRequest(`${key} должен быть true или false`)
  }
  if (!Object.keys(changes).length) throw ApiError.badRequest('Нет настроек для изменения')

  const data = {...changes}
  if (Object.prototype.hasOwnProperty.call(changes, 'marketing_emails_enabled')) {
    if (changes.marketing_emails_enabled === true) {
      data.marketing_consent_at = new Date()
      data.marketing_consent_revoked_at = null
      data.marketing_consent_version = '2026-09-06'
    } else {
      data.marketing_consent_revoked_at = new Date()
    }
  }

  const user = await prisma.user.update({
    where: {id: user_id},
    data,
    select: {
      id: true,
      email: true,
      role: true,
      created_at: true,
      order_notifications_enabled: true,
      marketing_emails_enabled: true,
      email_verified_at: true,
      is_active: true,
      can_manage_orders: true,
      can_manage_catalog: true,
      can_manage_discounts: true,
      can_manage_campaigns: true
    }
  })

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    order_notifications_enabled: user.order_notifications_enabled !== false,
    marketing_emails_enabled: user.marketing_emails_enabled === true,
    email_verified: Boolean(user.email_verified_at),
    is_active: user.is_active !== false,
    can_manage_orders: user.role === 'admin' || user.can_manage_orders === true,
    can_manage_catalog: user.role === 'admin' || user.can_manage_catalog === true,
    can_manage_discounts: user.role === 'admin' || user.can_manage_discounts === true,
    can_manage_campaigns: user.role === 'admin' || user.can_manage_campaigns === true
  }
}

const getSessions = async user_id => prisma.refreshToken.findMany({
  where: {
    user_id,
    revoked_at: null,
    expires_at: {gt: new Date()}
  },
  select: {
    id: true,
    created_at: true,
    expires_at: true,
    user_agent: true,
    ip_address: true
  },
  orderBy: {created_at: 'desc'}
})

const logoutAll = async user_id => {
  await prisma.refreshToken.deleteMany({where: {user_id}})
  return true
}

const logoutSessionById = async (user_id, session_id) => {
  const numeric_session_id = Number(session_id)

  if (!Number.isInteger(numeric_session_id) || numeric_session_id <= 0) {
    throw ApiError.badRequest('Некорректный id сессии')
  }

  const session = await prisma.refreshToken.findUnique({where: {id: numeric_session_id}})

  if (!session) throw ApiError.notFound('Сессия не найдена')
  if (session.user_id !== user_id) throw ApiError.forbidden('Нет доступа к этой сессии')

  await prisma.refreshToken.delete({where: {id: numeric_session_id}})
  return true
}

export default {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  getMe,
  updatePreferences,
  getSessions,
  logoutAll,
  logoutSessionById
}
