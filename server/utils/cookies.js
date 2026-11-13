const parseBoolean = value => {
  if (value === undefined || value === null || value === '') return null
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return null
}

// Local Docker uses NODE_ENV=production too, but runs over http://localhost.
// Secure cookies must therefore follow the actual public URL (or explicit override),
// not NODE_ENV. In production NUXT_PUBLIC_APP_URL is HTTPS, so cookies stay Secure.
const configured_secure = parseBoolean(process.env.COOKIE_SECURE)
const public_url_is_https = /^https:\/\//i.test(String(process.env.NUXT_PUBLIC_APP_URL || ''))
const cookie_secure = configured_secure ?? public_url_is_https

// Общие опции нужны также для удаления cookie при выходе.
export const refresh_cookie_options = {
  httpOnly: true,
  secure: cookie_secure,
  sameSite: 'lax',
  path: '/'
}

// Время cookie берём непосредственно из JWT, чтобы оно всегда совпадало
// с фактическим сроком токена (30 дней покупателю, 7 дней сотруднику).
export const refreshCookieOptionsForToken = token => {
  const payload_part = String(token || '').split('.')[1]
  if (!payload_part) throw new Error('Невозможно определить срок refresh token')
  const payload = JSON.parse(Buffer.from(payload_part, 'base64url').toString('utf8'))
  if (!Number.isSafeInteger(payload.exp)) throw new Error('Refresh token не содержит срок действия')
  return {
    ...refresh_cookie_options,
    maxAge: Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
  }
}

export const guest_cookie_options = {
  httpOnly: true,
  secure: cookie_secure,
  sameSite: 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60
}

export const cookieSecurityMode = () => ({secure: cookie_secure, source: configured_secure === null ? 'app-url' : 'override'})
