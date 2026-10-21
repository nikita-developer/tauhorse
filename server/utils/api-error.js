export class ApiError extends Error {
  constructor(status = 500, message = 'Внутренняя ошибка сервера', data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }

  static badRequest(message = 'Некорректный запрос', data = null) {
    return new ApiError(400, message, data)
  }

  static unauthorized(message = 'Не авторизован') {
    return new ApiError(401, message)
  }

  static forbidden(message = 'Доступ запрещён') {
    return new ApiError(403, message)
  }

  static notFound(message = 'Не найдено') {
    return new ApiError(404, message)
  }
}
