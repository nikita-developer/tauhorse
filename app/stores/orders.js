import {defineStore} from 'pinia'
import {createApiUrl} from '~/utils/api'
import {useAuthStore} from '~/stores/auth'

export const useOrdersStore = defineStore('orders', {
    state: () => ({
        my_orders: [],
        guest_orders: [],
        order: null,
        admin_orders: [],
        admin_meta: null,
        status_history: [],
        activity: [],
        status_options: [],
        managers: []
    }),

    getters: {
        has_orders: state => state.my_orders.length > 0 || state.guest_orders.length > 0
    },

    actions: {
        async apiFetch(path, options = {}) {
            const auth_store = useAuthStore()
            return await auth_store.authFetch(createApiUrl(path), options)
        },

        async createOrder(payload) {
            return await this.apiFetch('/orders', {
                method: 'POST',
                credentials: 'include',
                body: payload
            })
        },

        async fetchMyOrders() {
            const response = await this.apiFetch('/orders/my', {credentials: 'include'})
            this.my_orders = response
            return response
        },

        async fetchGuestOrders() {
            const response = await $fetch(createApiUrl('/orders/guest/my'), {
                credentials: 'include'
            })
            this.guest_orders = response
            return response
        },

        async fetchOrders({is_authenticated = false} = {}) {
            if (is_authenticated) return await this.fetchMyOrders()
            return await this.fetchGuestOrders()
        },

        async fetchOrder(id, token = '') {
            const headers = token ? {'X-Order-Access-Token': token} : {}
            const response = await this.apiFetch(`/orders/${id}`, {
                credentials: 'include',
                headers
            })
            this.order = response
            return response
        },

        clearCurrentOrder() {
            this.order = null
            this.status_history = []
            this.activity = []
        },

        clearOrders() {
            this.my_orders = []
            this.guest_orders = []
        },

        async fetchAdminOrders(filters) {
            const response = await this.apiFetch('/orders/admin/all', {query: filters})
            this.admin_orders = response.items || response
            this.admin_meta = response.meta || null
            return response
        },

        async fetchAdminOrder(id) {
            const response = await this.apiFetch(`/orders/admin/${id}`)
            this.order = response
            return response
        },

        async fetchOrderHistory(id) {
            const response = await this.apiFetch(`/orders/${id}/history`)
            this.status_history = response
            return response
        },

        async fetchOrderActivity(id) {
            const response = await this.apiFetch(`/orders/${id}/activity`)
            this.activity = response || []
            return response
        },

        async fetchStatusOptions(id) {
            const response = await this.apiFetch(`/orders/${id}/status-options`)
            this.status_options = response
            return response
        },

        async updateOrderStatus(id, status) {
            const response=await this.apiFetch(`/orders/${id}/status`,{method:'PATCH',body:{status}})
            this.order=response
            return response
        },

        async fetchManagers(){
            const response=await this.apiFetch('/staff/admin/managers')
            this.managers=response||[]
            return response
        },

        async assignOrder(id, manager_id){
            const response=await this.apiFetch(`/orders/${id}/assign`,{method:'POST',body:{manager_id}})
            this.order=response
            return response
        },

        async cancelCustomerOrder(id,{token='',restore_to_cart=true}={}){
            const headers=token?{'X-Order-Access-Token':token}:{}
            const response=await this.apiFetch(`/orders/${id}/cancel`,{method:'POST',credentials:'include',headers,body:{restore_to_cart}})
            this.order=response.order
            return response
        },

        async updateAdminOrder(id, changes) {
            const response = await this.apiFetch(`/orders/admin/${id}`, {
                method: 'PATCH',
                body: changes
            })
            this.order = response
            return response
        },

        async updateAdminOrderNote(id, admin_note) {
            return await this.updateAdminOrder(id, {admin_note})
        }
    }
})
