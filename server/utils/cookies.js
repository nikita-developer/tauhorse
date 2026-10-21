const parseDurationSeconds = (value, fallback_seconds) => {
  if (!value) return fallback_seconds
  const match = String(value).trim().match(/^(\d+)(s|m|h|d)$/i)
  if (!match) return fallback_seconds

  const amount = Number(match[1])
  const multiplier = {s: 1, m: 60, h: 3600, d: 86400}[match[2].toLowerCase()]
  return amount * multiplier
}

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

export const refresh_cookie_options = {
  httpOnly: true,
  secure: cookie_secure,
  sameSite: 'lax',
  path: '/',
  maxAge: parseDurationSeconds(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60)
}

export const guest_cookie_options = {
  httpOnly: true,
  secure: cookie_secure,
  sameSite: 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60
}

export const cookieSecurityMode = () => ({secure: cookie_secure, source: configured_secure === null ? 'app-url' : 'override'})
