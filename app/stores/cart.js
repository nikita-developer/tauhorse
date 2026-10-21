import {defineStore} from 'pinia'
import {createApiUrl} from '~/utils/api'
import {useAuthStore} from '~/stores/auth'

export const useCartStore = defineStore('cart', {
    state: () => ({
        cart: null,
        is_loading: false,
        is_loaded: false,
        fetch_cart_promise: null
    }),

    getters: {
        items: state => Array.isArray(state.cart?.items) ? state.cart.items : [],
        total_price: state => Number(state.cart?.total_price || 0),
        regular_subtotal: state => Number(state.cart?.regular_subtotal ?? state.cart?.subtotal ?? state.cart?.total_price ?? 0),
        promotion_discount_amount: state => Number(state.cart?.promotion_discount_amount || 0),
        subtotal: state => Number(state.cart?.subtotal ?? state.cart?.total_price ?? 0),
        discount_amount: state => Number(state.cart?.discount_amount || 0),
        discount_percent: state => Number(state.cart?.discount_percent || 0),
        items_count: state => {
            const items = Array.isArray(state.cart?.items) ? state.cart.items : []
            return items.reduce((total_count, item) => total_count + Number(item.quantity || 0), 0)
        }
    },

    actions: {
        async apiFetch(path, options = {}) {
            const auth_store = useAuthStore()
            if (!auth_store.is_initialized) await auth_store.initAuth()
            return await auth_store.authFetch(createApiUrl(path), {
                credentials: 'include',
                ...options
            })
        },

        async fetchCart() {
            if (this.fetch_cart_promise) return await this.fetch_cart_promise

            this.is_loading = true
            this.fetch_cart_promise = this.apiFetch('/cart')
                .then(response => {
                    this.cart = response
                    this.is_loaded = true
                    return response
                })
                .finally(() => {
                    this.is_loading = false
                    this.fetch_cart_promise = null
                })

            return await this.fetch_cart_promise
        },

        async ensureCartLoaded() {
            if (this.is_loaded) return this.cart
            return await this.fetchCart()
        },

        async addItem(product_id, quantity = 1) {
            const response = await this.apiFetch('/cart/items', {
                method: 'POST',
                body: {product_id, quantity}
            })
            this.cart = response
            this.is_loaded = true
            return response
        },

        async updateItem(product_id, quantity) {
            const response = await this.apiFetch(`/cart/items/${product_id}`, {
                method: 'PATCH',
                body: {quantity}
            })
            this.cart = response
            this.is_loaded = true
            return response
        },

        async removeItem(product_id) {
            const response = await this.apiFetch(`/cart/items/${product_id}`, {method: 'DELETE'})
            this.cart = response
            this.is_loaded = true
            return response
        }
    }
})
