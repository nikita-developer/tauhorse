import {ApiError} from './api-error.js'

export const REGISTRATION_MIN_FILL_MS = 1800
export const REGISTRATION_MAX_AGE_MS = 2 * 60 * 60 * 1000

export const validateRegistrationBotSignals = ({website = '', form_started_at, now = Date.now()} = {}) => {
  if (typeof website === 'string' && website.trim()) {
    throw new ApiError(400, 'Не удалось выполнить регистрацию')
  }
  const started = Number(form_started_at)
  if (!Number.isFinite(started) || started <= 0) throw new ApiError(400, 'Обновите страницу и попробуйте снова')
  const elapsed = now - started
  if (elapsed < REGISTRATION_MIN_FILL_MS) throw new ApiError(429, 'Слишком быстрая попытка регистрации. Попробуйте ещё раз')
  if (elapsed > REGISTRATION_MAX_AGE_MS || elapsed < 0) throw new ApiError(400, 'Форма регистрации устарела. Обновите страницу')
  return true
}
