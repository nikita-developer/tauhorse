export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  const auth_store = useAuthStore()

  if (!auth_store.is_initialized) {
    await auth_store.initAuth()
  }

  if (!auth_store.is_authenticated) {
    return navigateTo('/login')
  }
})
