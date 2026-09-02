<script setup>
import { computed } from 'vue'
import { Folder, House, Wallet } from '@element-plus/icons-vue'
import AppNavigation from '@/components/navigation/AppNavigation.vue'

const navigationItems = computed(() => [
  { route: '/app', label: 'Home', icon: House },
  { route: '/app/financial-accounts', label: 'Financial accounts', icon: Wallet },
  { route: '/app/financial-accounts/archived', label: 'Archived accounts', icon: Folder },
])
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <header class="app-header">
      <RouterLink class="brand" :to="{ name: 'protected-home' }">Zunera</RouterLink>
    </header>
    <div class="app-body">
      <AppNavigation :items="navigationItems" />
      <main id="main-content" class="app-main" tabindex="-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--color-canvas);
}

.skip-link {
  position: absolute;
  top: -60px;
  left: 16px;
  z-index: 50;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-action-primary);
  font-weight: 600;
}

.skip-link:focus {
  top: 12px;
}

.app-header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.brand {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-action-primary);
  text-decoration: none;
}

.app-body {
  display: grid;
  grid-template-columns: 256px minmax(0, 1fr);
  min-height: calc(100vh - 64px);
}

.app-main {
  min-width: 0;
  padding: 24px 32px;
  outline: none;
}

.app-main:focus {
  outline: none;
}

@media (max-width: 640px) {
  .app-body {
    grid-template-columns: 1fr;
  }

  .app-main {
    padding: 24px 16px;
  }
}
</style>
