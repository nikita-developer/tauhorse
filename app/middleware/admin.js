export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  const auth_store = useAuthStore()

  if (!auth_store.is_initialized) {
    await auth_store.initAuth()
  }

  // Временный сетевой сбой не должен отправлять на страницу входа.
  if (!auth_store.is_initialized) {
    return abortNavigation(createError({statusCode: 503, statusMessage: 'Не удалось проверить авторизацию. Попробуйте обновить страницу.'}))
  }

  if (!auth_store.is_authenticated) {
    return navigateTo('/login')
  }

  if (auth_store.user?.role !== 'admin') {
    return navigateTo('/')
  }
})
