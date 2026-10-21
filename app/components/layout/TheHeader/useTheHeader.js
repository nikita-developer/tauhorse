import {ref, watch, onBeforeUnmount} from 'vue'
import {useRoute, navigateTo} from '#app'
import {useAuthStore} from '~/stores/auth'

export const useTheHeader = () => {
    const auth_store = useAuthStore()
    const route = useRoute()
    const is_mobile_menu_open = ref(false)

    const closeMobileMenu = () => {
        is_mobile_menu_open.value = false

        if (process.client) {
            document.body.classList.remove('mobile-menu-open')
        }
    }

    const openMobileMenu = () => {
        is_mobile_menu_open.value = true

        if (process.client) {
            document.body.classList.add('mobile-menu-open')
        }
    }

    const toggleMobileMenu = () => {
        if (is_mobile_menu_open.value) {
            closeMobileMenu()
            return
        }

        openMobileMenu()
    }

    const handleLogout = async () => {
        await auth_store.logout()
        await navigateTo('/')
        closeMobileMenu()
    }

    const handleLogoutAndClose = async () => {
        closeMobileMenu()
        await auth_store.logout()
        await navigateTo('/')
    }

    watch(
        () => route.fullPath,
        () => {
            closeMobileMenu()
        }
    )

    onBeforeUnmount(() => {
        if (process.client) {
            document.body.classList.remove('mobile-menu-open')
        }
    })

    return {
        is_mobile_menu_open,
        closeMobileMenu,
        openMobileMenu,
        toggleMobileMenu,
        handleLogout,
        handleLogoutAndClose
    }
}