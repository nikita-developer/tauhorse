import bcrypt from 'bcrypt'
import {PrismaClient} from '@prisma/client'

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const password = String(process.env.ADMIN_PASSWORD || '')
if (!email || !email.includes('@')) throw new Error('Укажите ADMIN_EMAIL')
if (password.length < 12) throw new Error('ADMIN_PASSWORD должен содержать не менее 12 символов')

const prisma = new PrismaClient()
try {
  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.upsert({
    where: {email},
    update: {password: hashed, role: 'admin', email_verified_at: new Date()},
    create: {email, password: hashed, role: 'admin', email_verified_at: new Date()}
  })
  console.log(`Администратор ${email} создан или обновлён`)
} finally {
  await prisma.$disconnect()
}
