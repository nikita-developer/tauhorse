import {ref, watch, onBeforeUnmount} from 'vue'
import {useRoute, navigateTo} from '#app'
import {useAuthStore} from '~/stores/auth'

export const useTheHeader = () => {
    const auth_store = useAuthStore()
    const route = useRoute()
    const is_mobile_menu_open = ref(false)

    let locked_scroll_y = 0
    let previous_body_styles = null
    let previous_html_overflow = null

    const closeMobileMenu = () => {
        is_mobile_menu_open.value = false
        if (!import.meta.client) return

        document.body.classList.remove('mobile-menu-open')
        if (!previous_body_styles) return
        Object.assign(document.body.style, previous_body_styles)
        document.documentElement.style.overflow = previous_html_overflow
        previous_body_styles = null
        previous_html_overflow = null
        window.scrollTo(0, locked_scroll_y)
    }

    const openMobileMenu = () => {
        if (is_mobile_menu_open.value) return
        is_mobile_menu_open.value = true
        if (!import.meta.client) return

        locked_scroll_y = window.scrollY
        const body = document.body
        previous_body_styles = {
            position: body.style.position,
            top: body.style.top,
            left: body.style.left,
            right: body.style.right,
            width: body.style.width,
            overflow: body.style.overflow
        }
        previous_html_overflow = document.documentElement.style.overflow
        body.style.position = 'fixed'
        body.style.top = `-${locked_scroll_y}px`
        body.style.left = '0'
        body.style.right = '0'
        body.style.width = '100%'
        body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'
        body.classList.add('mobile-menu-open')
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

    onBeforeUnmount(() => closeMobileMenu())

    return {
        is_mobile_menu_open,
        closeMobileMenu,
        openMobileMenu,
        toggleMobileMenu,
        handleLogout,
        handleLogoutAndClose
    }
}