<script setup>
import { shallowRef } from 'vue'
import { CollectionTag, Folder, House, Wallet } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppNavigation from '@/components/navigation/AppNavigation.vue'
import { useSessionStore } from '@/stores/auth/sessionStore'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const navigationOpen = shallowRef(false)

const navigationItems = [
  { routeName: 'protected-home', label: 'Home', icon: House },
  { routeName: 'financial-accounts', label: 'Financial accounts', icon: Wallet },
  { routeName: 'financial-accounts-archived', label: 'Archived accounts', icon: Folder },
  { routeName: 'categories', label: 'Categories', icon: CollectionTag },
]

async function navigate(routeName) {
  navigationOpen.value = false
  await router.push({ name: routeName })
}

async function signOut() {
  await sessionStore.logout()
  await router.push({ name: 'sign-in' })
}
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <AppHeader
      :user="sessionStore.user"
      @open-navigation="navigationOpen = true"
      @sign-out="signOut"
    />
    <div class="app-body">
      <aside class="desktop-navigation">
        <AppNavigation :items="navigationItems" :active-route="route.name" @navigate="navigate" />
      </aside>
      <main id="main-content" class="app-main" tabindex="-1">
        <RouterView />
      </main>
    </div>
    <ElDrawer v-model="navigationOpen" direction="ltr" size="min(86vw, 320px)" :with-header="false">
      <div class="drawer-navigation">
        <p class="drawer-title">Navigation</p>
        <AppNavigation :items="navigationItems" :active-route="route.name" @navigate="navigate" />
      </div>
    </ElDrawer>
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

.app-body {
  display: grid;
  grid-template-columns: 256px minmax(0, 1fr);
  min-height: calc(100vh - 64px);
}

.desktop-navigation {
  min-width: 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
}

.app-main {
  min-width: 0;
  padding: 24px 32px;
  outline: none;
}

.drawer-navigation {
  padding: 16px;
}

.drawer-title {
  margin: 0 0 12px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  text-transform: uppercase;
}

@media (max-width: 1023px) {
  .app-body {
    grid-template-columns: 1fr;
  }

  .desktop-navigation {
    display: none;
  }

  .app-main {
    padding: 24px;
  }
}

@media (max-width: 639px) {
  .app-main {
    padding: 24px 16px;
  }
}
</style>
