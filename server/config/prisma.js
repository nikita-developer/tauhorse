import {PrismaClient} from '@prisma/client'

const global_for_prisma = globalThis

export const prisma = global_for_prisma.__prisma__ || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global_for_prisma.__prisma__ = prisma
}

export default prisma
