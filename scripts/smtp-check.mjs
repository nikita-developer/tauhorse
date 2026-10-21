import nodemailer from 'nodemailer'

const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
const missing = required.filter(name => !String(process.env[name] || '').trim())
if (missing.length) {
  throw new Error(`SMTP: не заполнены ${missing.join(', ')}`)
}

const port = Number(process.env.SMTP_PORT)
const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure,
  auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASS},
  disableFileAccess: true,
  disableUrlAccess: true,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000
})

await transporter.verify()
console.log('SMTP-соединение и авторизация проверены')
transporter.close()
