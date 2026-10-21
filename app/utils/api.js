export const createApiUrl = path => path.startsWith('/api') ? path : `/api${path}`

export const getAuthHeaders = token => {
  if (!token) return {}
  return {Authorization: `Bearer ${token}`}
}

export const isJwtExpiring = (token, skew_seconds = 30) => {
  if (!token || typeof token !== 'string') return true

  try {
    const payload_part = token.split('.')[1]
    if (!payload_part) return true

    const normalized = payload_part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded))

    if (!payload?.exp) return true
    return payload.exp <= Math.floor(Date.now() / 1000) + skew_seconds
  } catch {
    return true
  }
}

export const getApiErrorMessage = error => {
  const default_message = 'Произошла ошибка при запросе к API'
  const response_message = error?.data?.message
  const fallback_message = error?.message

  return response_message || fallback_message || default_message
}
