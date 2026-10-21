<template>
  <div class="app-layout">
    <TheHeader />
    <AppBreadcrumbs />
    <main class="app-layout__main">
      <slot />
    </main>
    <TheFooter />
    <CookieNotice />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import TheHeader from '~/components/layout/TheHeader/TheHeader.vue'
import TheFooter from '~/components/layout/TheFooter/TheFooter.vue'
import AppBreadcrumbs from '~/components/ui/AppBreadcrumbs.vue'
import CookieNotice from '~/components/legal/CookieNotice/CookieNotice.vue'
import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'

const cart_store = useCartStore()
const auth_store = useAuthStore()

const syncCart = async () => {
  try {
    await cart_store.fetchCart()
  } catch (error) {
    console.error(error)
  }
}

watch(
  () => auth_store.access_token,
  async (next_token, previous_token) => {
    if (next_token === previous_token || !auth_store.is_initialized) {
      return
    }

    await syncCart()
  }
)

onMounted(async () => {
  try {
    if (!auth_store.is_initialized) {
      await auth_store.initAuth()
    }

    await cart_store.ensureCartLoaded()
  } catch (error) {
    console.error(error)
  }
})
</script>

<style scoped>
.app-layout { display: flex; flex-direction: column; min-height: 100dvh; }
.app-layout__main { display: flex; flex: 1 0 auto; flex-direction: column; min-width: 0; }
.app-layout__main > :deep(*) { flex: 1 0 auto; }
</style>
