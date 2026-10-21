import {defineStore} from 'pinia'
import {createApiUrl, getApiErrorMessage} from '~/utils/api'
import {useAuthStore} from '~/stores/auth'

export const useCategoriesStore = defineStore('categories', {
  state: () => ({
    items: [],
    category: null,
    is_loading: false,
    error_message: ''
  }),
  actions: {
    async fetchCategories() {
      this.is_loading = true

      try {
        const response = await $fetch(createApiUrl('/categories'))
        this.items = response
        return response
      } catch (error) {
        this.error_message = getApiErrorMessage(error)
        throw error
      } finally {
        this.is_loading = false
      }
    },

    async fetchCategory(id) {
      this.category = await $fetch(createApiUrl(`/categories/${id}`))
      return this.category
    },

    async createCategory(payload) {
      const auth_store = useAuthStore()
      return await auth_store.authFetch(createApiUrl('/categories'), {
        method: 'POST',
        body: payload
      })
    },

    async updateCategory(id, payload) {
      const auth_store = useAuthStore()
      return await auth_store.authFetch(createApiUrl(`/categories/${id}`), {
        method: 'PATCH',
        body: payload
      })
    },

    async deleteCategory(id) {
      const auth_store = useAuthStore()
      return await auth_store.authFetch(createApiUrl(`/categories/${id}`), {
        method: 'DELETE'
      })
    }
  }
})
