import crypto from 'crypto'
export const generateOrderToken = () => crypto.randomBytes(32).toString('hex')
