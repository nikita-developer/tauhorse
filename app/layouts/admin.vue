<template>
  <div class="admin-shell">
    <TheHeader/>
    <AppBreadcrumbs/>
    <div class="admin-layout">
      <AdminSidebar/>
      <main class="admin-layout__content">
        <slot/>
      </main>
    </div>
  </div>
</template>

<script setup>
import TheHeader from '~/components/layout/TheHeader/TheHeader.vue'
import AdminSidebar from '~/components/admin/AdminSidebar/AdminSidebar.vue'
import AppBreadcrumbs from '~/components/ui/AppBreadcrumbs.vue'
</script>

<style scoped lang="scss">
.admin-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
}

.admin-layout__content {
  min-width: 0;
}

@media (max-width: 900px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }
}
</style>
