const required = [
  'DOMAIN', 'LETSENCRYPT_EMAIL', 'NUXT_PUBLIC_APP_URL', 'POSTGRES_PASSWORD',
  'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'NUXT_PUBLIC_SHOP_NAME',
  'NUXT_PUBLIC_SHOP_EMAIL', 'NUXT_PUBLIC_SHOP_PHONE',
  'NUXT_PUBLIC_SHOP_PHONE_DISPLAY', 'NUXT_PUBLIC_SHOP_ADDRESS',
  'NUXT_PUBLIC_SELLER_NAME', 'NUXT_PUBLIC_SELLER_ID', 'NUXT_PUBLIC_SELLER_INN',
  'NUXT_PUBLIC_SELLER_OGRNIP', 'NUXT_PUBLIC_SELLER_LEGAL_ADDRESS',
  'NUXT_PUBLIC_CLAIMS_EMAIL'
]

const parseDurationSeconds = (value, fieldName) => {
  const match = String(value || '').trim().match(/^(\d+)(s|m|h|d)$/i)
  if (!match) throw new Error(`${fieldName}: используйте формат 15m, 7d и т.п.`)
  const multiplier = {s: 1, m: 60, h: 3600, d: 86400}[match[2].toLowerCase()]
  return Number(match[1]) * multiplier
}


const isValidInn12 = value => {
  const digits = String(value || '').split('').map(Number)
  if (digits.length !== 12 || digits.some(Number.isNaN)) return false
  const checksum = coefficients => coefficients.reduce((sum, coefficient, index) => sum + coefficient * digits[index], 0) % 11 % 10
  return checksum([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[10]
    && checksum([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[11]
}

const isValidOgrnip = value => {
  const text = String(value || '')
  if (!/^\d{15}$/.test(text)) return false
  return Number(BigInt(text.slice(0, 14)) % 13n % 10n) === Number(text[14])
}

const missing = required.filter(name => !String(process.env[name] || '').trim())
if (missing.length) throw new Error(`Не заполнены переменные: ${missing.join(', ')}`)

const values = required.map(name => process.env[name]).join(' ')
if (/example\.|replace-with|укажите|локальн|000-00-00/i.test(values)) throw new Error('В .env остались демонстрационные значения')

if (!/^[a-z0-9.-]+$/i.test(process.env.DOMAIN) || process.env.DOMAIN.includes('..')) {
  throw new Error('DOMAIN должен содержать только доменное имя без протокола и пути')
}
if (process.env.NUXT_PUBLIC_APP_URL !== `https://${process.env.DOMAIN}`) {
  throw new Error('NUXT_PUBLIC_APP_URL должен быть равен https://DOMAIN')
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.LETSENCRYPT_EMAIL)) {
  throw new Error("LETSENCRYPT_EMAIL должен содержать корректный email для уведомлений Let's Encrypt")
}
if (!/^[A-Za-z0-9]{24,}$/.test(process.env.POSTGRES_PASSWORD)) {
  throw new Error('POSTGRES_PASSWORD: минимум 24 символа, только латинские буквы и цифры')
}
if (process.env.JWT_ACCESS_SECRET.length < 32 || process.env.JWT_REFRESH_SECRET.length < 32) {
  throw new Error('Каждый JWT-секрет должен содержать минимум 32 символа')
}
if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) throw new Error('JWT-секреты должны отличаться')
if (!isValidInn12(process.env.NUXT_PUBLIC_SELLER_INN)) throw new Error('NUXT_PUBLIC_SELLER_INN должен быть корректным 12-значным ИНН физлица/ИП')
if (!isValidOgrnip(process.env.NUXT_PUBLIC_SELLER_OGRNIP)) throw new Error('NUXT_PUBLIC_SELLER_OGRNIP должен быть корректным 15-значным ОГРНИП')
if (process.env.NUXT_PUBLIC_SELLER_ID !== process.env.NUXT_PUBLIC_SELLER_OGRNIP) throw new Error('NUXT_PUBLIC_SELLER_ID и NUXT_PUBLIC_SELLER_OGRNIP должны совпадать для ИП')
if (String(process.env.COOKIE_SECURE || '').toLowerCase() !== 'true') throw new Error('COOKIE_SECURE должен быть true')

const smtpFields = ['SMTP_HOST','SMTP_USER','SMTP_PASS','MAIL_FROM']
const smtpConfigured = smtpFields.some(name => String(process.env[name] || '').trim())
if (smtpConfigured) {
  const smtpMissing = smtpFields.filter(name => !String(process.env[name] || '').trim())
  if (smtpMissing.length) throw new Error(`SMTP настроен частично. Заполните либо все поля, либо ни одного: ${smtpMissing.join(', ')}`)
  const smtpPort = Number(process.env.SMTP_PORT || 465)
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) throw new Error('SMTP_PORT должен быть корректным TCP-портом')
  if (!['true', 'false'].includes(String(process.env.SMTP_SECURE || 'true').toLowerCase())) throw new Error('SMTP_SECURE должен быть true или false')
  const mailFromAddress = String(process.env.MAIL_FROM || '').match(/<([^<>]+)>\s*$/)?.[1] || String(process.env.MAIL_FROM || '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailFromAddress)) throw new Error('MAIL_FROM должен содержать корректный email, например noreply@tauhorse.ru или TauHorse <noreply@tauhorse.ru>')
} else {
  console.warn('SMTP пока не настроен: сайт запустится, но подтверждение email, восстановление пароля и email-уведомления не будут отправляться.')
}

const accessTtl = parseDurationSeconds(process.env.JWT_ACCESS_EXPIRES_IN || '15m', 'JWT_ACCESS_EXPIRES_IN')
const refreshTtl = parseDurationSeconds(process.env.JWT_REFRESH_EXPIRES_IN || '7d', 'JWT_REFRESH_EXPIRES_IN')
if (accessTtl < 60 || accessTtl > 30 * 60) throw new Error('JWT_ACCESS_EXPIRES_IN должен быть от 1 до 30 минут')
if (refreshTtl < 24 * 60 * 60 || refreshTtl > 30 * 24 * 60 * 60) throw new Error('JWT_REFRESH_EXPIRES_IN должен быть от 1 до 30 дней')

console.log('Production .env заполнен корректно')
