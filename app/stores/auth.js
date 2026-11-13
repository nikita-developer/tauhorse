import {defineStore} from 'pinia'
import {useRequestHeaders} from '#app'
import {createApiUrl, getApiErrorMessage, getAuthHeaders, isJwtExpiring} from '~/utils/api'

// Только подтверждённый отказ авторизации означает, что нужно выйти.
// Ошибки сети и 5xx не должны удалять вход пользователя.
const isDefinitiveAuthError = error => {
    const status = Number(error?.statusCode || error?.status || error?.response?.status)
    return status === 401 || status === 403
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        access_token: null,
        is_loading: false,
        is_initialized: false,
        sessions: [],
        error_message: '',
        init_promise: null,
        refresh_promise: null
    }),
    getters: {
        is_authenticated: state => Boolean(state.access_token && state.user)
    },
    actions: {
        setAuthData(payload) {
            const access_token = payload?.access_token || null
            const user = payload?.user || null

            this.access_token = access_token
            this.user = user
        },
        clearAuthData() {
            this.user = null
            this.access_token = null
            this.sessions = []
        },
        async initAuth() {
            if (this.init_promise) {
                return await this.init_promise
            }

            this.init_promise = (async () => {
                this.is_loading = true

                let initialized = false
                try {
                    await this.refreshToken()
                    await this.fetchMe()
                    initialized = true
                } catch (error) {
                    if (isDefinitiveAuthError(error)) {
                        this.clearAuthData()
                        initialized = true
                    } else {
                        // На следующем обращении повторим восстановление сессии.
                        console.warn('Не удалось восстановить сессию: временная ошибка')
                    }
                } finally {
                    this.is_initialized = initialized
                    this.is_loading = false
                    this.init_promise = null
                }
            })()

            return await this.init_promise
        },
        async register(payload) {
            this.is_loading = true
            this.error_message = ''

            try {
                const response = await $fetch(createApiUrl('/auth/register'), {
                    method: 'POST',
                    credentials: 'include',
                    body: payload
                })

                return response
            } catch (error) {
                this.error_message = getApiErrorMessage(error)
                throw error
            } finally {
                this.is_loading = false
            }
        },
        async verifyEmail(payload) {
            return await $fetch(createApiUrl('/auth/verify-email'), {
                method: 'POST',
                body: payload
            })
        },
        async resendVerification(payload) {
            return await $fetch(createApiUrl('/auth/resend-verification'), {
                method: 'POST',
                body: payload
            })
        },
        async login(payload) {
            this.is_loading = true
            this.error_message = ''

            try {
                const response = await $fetch(createApiUrl('/auth/login'), {
                    method: 'POST',
                    credentials: 'include',
                    body: payload
                })

                this.setAuthData(response)
                return response
            } catch (error) {
                this.error_message = getApiErrorMessage(error)
                throw error
            } finally {
                this.is_loading = false
            }
        },
        async refreshToken() {
            if (this.refresh_promise) {
                return await this.refresh_promise
            }

            const headers = import.meta.server
                ? useRequestHeaders(['cookie'])
                : undefined

            const fetchRefresh = () => $fetch(createApiUrl('/auth/refresh'), {
                method: 'POST',
                credentials: 'include',
                headers
            })

            // Refresh token вращается после каждого запроса. Без блокировки
            // две вкладки могут отправить одну и ту же cookie: вторая получит 401.
            // Web Locks сериализует обращения к cookie между вкладками домена.
            const safelyRefresh = () => {
                if (import.meta.client && navigator.locks?.request) {
                    return navigator.locks.request('tauhorse-auth-refresh', fetchRefresh)
                }
                return fetchRefresh()
            }

            this.refresh_promise = safelyRefresh()
                .then(response => {
                    this.access_token = response.access_token
                    return response
                })
                .finally(() => {
                    this.refresh_promise = null
                })

            return await this.refresh_promise
        },
        async authFetch(url, options = {}) {
            if (!this.access_token) {
                return await $fetch(url, options)
            }

            if (isJwtExpiring(this.access_token)) {
                try {
                    await this.refreshToken()
                    await this.fetchMe()
                } catch (refresh_error) {
                    if (isDefinitiveAuthError(refresh_error)) this.clearAuthData()
                    throw refresh_error
                }
            }

            const execute = async () => {
                const headers = {
                    ...(options.headers || {}),
                    ...getAuthHeaders(this.access_token)
                }

                return await $fetch(url, {
                    ...options,
                    headers
                })
            }

            try {
                return await execute()
            } catch (error) {
                const status = error?.statusCode || error?.status || error?.response?.status
                if (status !== 401) throw error

                try {
                    await this.refreshToken()
                    await this.fetchMe()
                    return await execute()
                } catch (refresh_error) {
                    if (isDefinitiveAuthError(refresh_error)) this.clearAuthData()
                    throw refresh_error
                }
            }
        },
        async fetchMe() {
            if (!this.access_token) {
                return null
            }

            const response = await $fetch(createApiUrl('/auth/me'), {
                headers: getAuthHeaders(this.access_token)
            })

            this.user = response
            return response
        },
        async logout() {
            try {
                await $fetch(createApiUrl('/auth/logout'), {
                    method: 'POST',
                    credentials: 'include'
                })
            } finally {
                this.clearAuthData()
            }
        },
        async forgotPassword(payload) {
            return await $fetch(createApiUrl('/auth/forgot-password'), {
                method: 'POST',
                body: payload
            })
        },
        async resetPassword(payload) {
            const response = await $fetch(createApiUrl('/auth/reset-password'), {
                method: 'POST',
                credentials: 'include',
                body: payload
            })

            this.clearAuthData()
            return response
        },
        async updatePreferences(payload) {
            const response = await this.authFetch(createApiUrl('/auth/preferences'), {
                method: 'PATCH',
                body: payload
            })

            this.user = response
            return response
        },
        async fetchSessions() {
            const response = await this.authFetch(createApiUrl('/auth/sessions'))

            this.sessions = response
            return response
        },
        async logoutAll() {
            try {
                await this.authFetch(createApiUrl('/auth/logout-all'), {
                    method: 'POST',
                    credentials: 'include'
                })
            } finally {
                this.clearAuthData()
            }
        },
        async deleteSession(id) {
            await this.authFetch(createApiUrl(`/auth/sessions/${id}`), {
                method: 'DELETE'
            })

            await this.fetchSessions()
        }
    }
})
