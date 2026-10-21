import crypto from 'node:crypto'

export const generateEmailVerificationToken = () => crypto.randomBytes(32).toString('hex')
