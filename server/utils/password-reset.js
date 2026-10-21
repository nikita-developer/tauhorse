import crypto from 'crypto'
export const generatePasswordResetToken = () => crypto.randomBytes(32).toString('hex')
