import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const JWT_ALGORITHM = 'HS256'
const getConfig = () => useRuntimeConfig()

export const generateAccessToken = payload => {
  const config = getConfig()
  return jwt.sign(payload, config.jwtAccessSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: config.jwtAccessExpiresIn
  })
}

export const generateRefreshToken = payload => {
  const config = getConfig()
  return jwt.sign(payload, config.jwtRefreshSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: config.jwtRefreshExpiresIn,
    jwtid: crypto.randomUUID()
  })
}

export const verifyRefreshToken = token => {
  const config = getConfig()
  return jwt.verify(token, config.jwtRefreshSecret, {algorithms: [JWT_ALGORITHM]})
}

export const verifyAccessToken = token => {
  const config = getConfig()
  return jwt.verify(token, config.jwtAccessSecret, {algorithms: [JWT_ALGORITHM]})
}

export const getTokenExpirationDate = token => {
  const decoded = jwt.decode(token)
  if (!decoded?.exp) throw new Error('JWT не содержит exp')
  return new Date(decoded.exp * 1000)
}
