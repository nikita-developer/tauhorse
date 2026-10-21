<template>
  <div>
    <NuxtLoadingIndicator color="#8f6840" :height="3" :throttle="120" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <AppPreloader :visible="show_preloader" />
    <AppToastStack />
  </div>
</template>

<script setup>
import {computed, onMounted, ref} from 'vue'
import {useAuthStore} from '~/stores/auth'
import AppPreloader from '~/components/ui/AppPreloader.vue'
import AppToastStack from '~/components/ui/AppToastStack.vue'

const auth_store = useAuthStore()
const app_is_ready = ref(false)
const show_preloader = computed(() => !app_is_ready.value)

onMounted(async () => {
  try {
    if (!auth_store.is_initialized) {
      await auth_store.initAuth()
    }
  } finally {
    app_is_ready.value = true
  }
})
</script>
