export const useSessionList = () => {
  const auth_store = useAuthStore()

  const logoutAll = async () => {
    await auth_store.logoutAll()
    await navigateTo('/login')
  }

  const deleteSession = async id => {
    await auth_store.deleteSession(id)
  }

  return {
    logoutAll,
    deleteSession
  }
}
