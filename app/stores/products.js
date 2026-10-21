import {defineStore} from 'pinia'
import {createApiUrl} from '~/utils/api'
import {useAuthStore} from '~/stores/auth'
import {defaultCatalogFilters} from '~/utils/catalog-filters'

let active_products_request = null

export const useProductsStore = defineStore('products', {
  state: () => ({
    items: [],
    meta: {page: 1, limit: 12, total: 0, total_pages: 1, price_range: {min: 0, max: 0}},
    product: null,
    filters: {...defaultCatalogFilters(), page: 1, limit: 12, category_slug: ''},
    is_loading: false
  }),
  actions: {
    async fetchProducts(custom_filters = {}, options = {}) {
      if (import.meta.client && active_products_request) active_products_request.abort()
      const request_controller = import.meta.client ? new AbortController() : null
      if (request_controller) active_products_request = request_controller
      this.is_loading = true

      const base = options.replace
        ? {...defaultCatalogFilters(), page: 1, limit: 12, category_slug: ''}
        : this.filters
      const full_filters = {...base, ...custom_filters}
      const query = {...full_filters}
      Object.keys(query).forEach(key => {
        const value = query[key]
        if (value === '' || value === null || value === undefined || value === false) delete query[key]
      })

      try {
        const response = await $fetch(createApiUrl('/products'), {query, signal: request_controller?.signal})
        this.items = response.items
        this.meta = response.meta
        if (options.persist !== false) this.filters = full_filters
        return response
      } catch (error) {
        if (error?.name === 'AbortError' || error?.cause?.name === 'AbortError') return null
        throw error
      } finally {
        if (!request_controller || active_products_request === request_controller) {
          this.is_loading = false
          if (request_controller) active_products_request = null
        }
      }
    },
    async fetchProduct(id) {
      const response = await $fetch(createApiUrl(`/products/${id}`))
      this.product = response
      return response
    },
    async createProduct(payload) {
      const auth_store = useAuthStore()
      const product = await auth_store.authFetch(createApiUrl('/products'), {method: 'POST', body: payload})
      this.items = [product, ...this.items.filter(item => Number(item.id) !== Number(product.id))]
      return product
    },
    async deleteProduct(id) {
      const auth_store = useAuthStore()
      const response = await auth_store.authFetch(createApiUrl(`/products/${id}`), {method: 'DELETE'})
      this.items = this.items.filter(item => Number(item.id) !== Number(id))
      if (Number(this.product?.id) === Number(id)) this.product = null
      return response
    },
    async updateProduct(id, payload) {
      const auth_store = useAuthStore()
      const product = await auth_store.authFetch(createApiUrl(`/products/${id}`), {method: 'PATCH', body: payload})
      const index = this.items.findIndex(item => Number(item.id) === Number(id))
      if (index >= 0) this.items[index] = product
      if (Number(this.product?.id) === Number(id)) this.product = product
      return product
    },
    async uploadMedia(id, files) {
      const auth_store = useAuthStore()
      const body = new FormData()
      for (const file of files) body.append('files', file)
      return await auth_store.authFetch(createApiUrl(`/products/${id}/media`), {method: 'POST', body})
    },
    async deleteMedia(productId, mediaId) {
      const auth_store = useAuthStore()
      return await auth_store.authFetch(createApiUrl(`/products/${productId}/media/${mediaId}`), {method: 'DELETE'})
    }
  }
})
