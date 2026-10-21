<template>
  <transition name="app-preloader-fade">
    <div v-if="visible" class="app-preloader">
      <div class="app-preloader__inner">
        <div class="app-preloader__spinner"></div>
        <p class="app-preloader__text">Загрузка...</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped lang="scss">
.app-preloader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #f8f4ec 0%, #fcfbf8 38%, #f6f1e8 100%);
}

.app-preloader__inner {
  display: grid;
  justify-items: center;
  gap: 14px;
}

.app-preloader__spinner {
  width: 52px;
  height: 52px;
  border: 4px solid rgba(122, 88, 51, 0.16);
  border-top-color: #7a5833;
  border-radius: 50%;
  animation: app-preloader-spin 0.8s linear infinite;
}

.app-preloader__text {
  margin: 0;
  color: #4a3723;
  font-size: 15px;
  font-weight: 600;
}

.app-preloader-fade-enter-active,
.app-preloader-fade-leave-active {
  transition: opacity 0.2s ease;
}

.app-preloader-fade-enter-from,
.app-preloader-fade-leave-to {
  opacity: 0;
}

@keyframes app-preloader-spin {
  to { transform: rotate(360deg); }
}
</style>
