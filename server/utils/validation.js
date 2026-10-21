import {ApiError} from './api-error.js'

const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const normalizeEmail = email => {
  if (typeof email !== 'string') {
    throw ApiError.badRequest('Некорректный email')
  }

  const normalized = email.trim().toLowerCase()

  if (!email_pattern.test(normalized) || normalized.length > 254) {
    throw ApiError.badRequest('Некорректный email')
  }

  return normalized
}

export const validatePassword = password => {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw ApiError.badRequest('Пароль должен содержать от 12 до 128 символов')
  }

  if (!/[\p{L}]/u.test(password) || !/\d/.test(password)) {
    throw ApiError.badRequest('Пароль должен содержать хотя бы одну букву и одну цифру')
  }

  return password
}

export const parsePositiveInteger = (value, field_name) => {
  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw ApiError.badRequest(`${field_name} должен быть целым числом больше 0`)
  }

  return parsed
}

export const parseNonNegativeInteger = (value, field_name) => {
  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw ApiError.badRequest(`${field_name} должен быть целым числом >= 0`)
  }

  return parsed
}

export const parseFiniteNumber = (value, field_name) => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    throw ApiError.badRequest(`${field_name} должен быть числом`)
  }

  return parsed
}

export const requireTrimmedString = (value, field_name, {max_length = 500} = {}) => {
  if (typeof value !== 'string') {
    throw ApiError.badRequest(`${field_name} обязателен`)
  }

  const normalized = value.trim()

  if (!normalized) {
    throw ApiError.badRequest(`${field_name} обязателен`)
  }

  if (normalized.length > max_length) {
    throw ApiError.badRequest(`${field_name} слишком длинный`)
  }

  return normalized
}

export const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100
