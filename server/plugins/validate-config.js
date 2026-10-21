const parseDurationSeconds = (value, fieldName) => {
  const match = String(value || '').trim().match(/^(\d+)(s|m|h|d)$/i)
  if (!match) throw new Error(`${fieldName} должен быть в формате 15m, 7d и т.п.`)
  const multiplier = {s: 1, m: 60, h: 3600, d: 86400}[match[2].toLowerCase()]
  return Number(match[1]) * multiplier
}

export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') return

  const app_url = String(process.env.NUXT_PUBLIC_APP_URL || '')
  const is_local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(app_url)
  if (is_local) return

  const required_env = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'NUXT_PUBLIC_APP_URL',
    'NUXT_PUBLIC_SHOP_NAME',
    'NUXT_PUBLIC_SHOP_EMAIL',
    'NUXT_PUBLIC_SHOP_PHONE',
    'NUXT_PUBLIC_SHOP_PHONE_DISPLAY',
    'NUXT_PUBLIC_SHOP_ADDRESS',
    'NUXT_PUBLIC_SELLER_NAME',
    'NUXT_PUBLIC_SELLER_ID'
  ]

  const missing = required_env.filter(name => !process.env[name])
  if (missing.length > 0) throw new Error(`Отсутствуют обязательные production variables: ${missing.join(', ')}`)

  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET и JWT_REFRESH_SECRET должны отличаться')
  }

  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (String(process.env[name]).length < 32) throw new Error(`${name} должен содержать не менее 32 символов`)
  }

  if (!app_url.startsWith('https://')) throw new Error('NUXT_PUBLIC_APP_URL должен использовать HTTPS')
  if (String(process.env.COOKIE_SECURE || '').toLowerCase() !== 'true') {
    throw new Error('COOKIE_SECURE должен быть true в production')
  }

  const smtpFields = ['SMTP_HOST','SMTP_USER','SMTP_PASS','MAIL_FROM']
  const smtpConfigured = smtpFields.some(name => String(process.env[name] || '').trim())
  if (smtpConfigured) {
    const smtpMissing = smtpFields.filter(name => !String(process.env[name] || '').trim())
    if (smtpMissing.length) throw new Error(`SMTP настроен частично: ${smtpMissing.join(', ')}`)
    const smtpPort = Number(process.env.SMTP_PORT || 465)
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) throw new Error('SMTP_PORT должен быть корректным TCP-портом')
    if (!['true', 'false'].includes(String(process.env.SMTP_SECURE || 'true').toLowerCase())) throw new Error('SMTP_SECURE должен быть true или false')
  }

  const accessTtl = parseDurationSeconds(process.env.JWT_ACCESS_EXPIRES_IN || '15m', 'JWT_ACCESS_EXPIRES_IN')
  const refreshTtl = parseDurationSeconds(process.env.JWT_REFRESH_EXPIRES_IN || '7d', 'JWT_REFRESH_EXPIRES_IN')
  if (accessTtl < 60 || accessTtl > 30 * 60) throw new Error('JWT_ACCESS_EXPIRES_IN должен быть от 1 до 30 минут')
  if (refreshTtl < 24 * 60 * 60 || refreshTtl > 30 * 24 * 60 * 60) throw new Error('JWT_REFRESH_EXPIRES_IN должен быть от 1 до 30 дней')

  if (/example\.|укажите|replace-with|000-00-00/i.test(required_env.map(name => process.env[name]).join(' '))) {
    throw new Error('В production variables остались демонстрационные значения')
  }
})
