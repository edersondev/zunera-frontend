<script setup>
import { computed, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { Calendar, Coin, CollectionTag, DataAnalysis, Delete, House, Money, Setting, Wallet } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import ProfileDialog from '@/components/auth/ProfileDialog.vue'
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog.vue'
import AppNavigation from '@/components/navigation/AppNavigation.vue'
import { useSessionStore } from '@/stores/auth/sessionStore'
import { useNotificationStore } from '@/stores/notifications/notificationStore'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const notificationStore = useNotificationStore()
const navigationOpen = shallowRef(false)
const profileOpen = shallowRef(false)
const passwordOpen = shallowRef(false)
const headerRef = shallowRef(null)
const { t } = useI18n()

function refreshNotifications() {
  if (sessionStore.user?.id && !document.hidden) notificationStore.loadSummary()
}

watch(() => sessionStore.user?.id ?? null, (id) => {
  notificationStore.bindOwner(id)
  if (id) notificationStore.loadSummary()
}, { immediate: true })

let refreshInterval = null
onMounted(() => {
  window.addEventListener('focus', refreshNotifications)
  document.addEventListener('visibilitychange', refreshNotifications)
  refreshInterval = window.setInterval(refreshNotifications, 60_000)
})
onUnmounted(() => {
  window.removeEventListener('focus', refreshNotifications)
  document.removeEventListener('visibilitychange', refreshNotifications)
  window.clearInterval(refreshInterval)
})

const navigationItems = computed(() => [
  { id: 'dashboard', routeName: 'dashboard', label: t('dashboard.title'), icon: House },
  {
    id: 'settings',
    label: t('app.settings'),
    icon: Setting,
    children: [
      {
        routeName: 'financial-accounts',
        activeRouteNames: ['financial-accounts', 'financial-accounts-archived'],
        label: t('app.financialAccounts'),
        icon: Wallet,
      },
      {
        routeName: 'categories',
        activeRouteNames: ['categories', 'categories-archived'],
        label: t('app.categories'),
        icon: CollectionTag,
      },
    ],
  },
  {
    id: 'cash-flow',
    label: t('app.cashFlow'),
    icon: Money,
    children: [
      { routeName: 'transactions', label: t('app.transactions'), icon: Money },
      { routeName: 'recurring-transactions', label: t('recurringTransactions.nav'), icon: Calendar },
      { routeName: 'transactions-removed', label: t('app.removedTransactions'), icon: Delete },
    ],
  },
  {
    id: 'credit-cards',
    routeName: 'credit-cards',
    activeRouteNames: ['credit-cards', 'credit-cards-archived', 'credit-card-detail'],
    label: t('app.creditCards'),
    icon: Money,
  },
  { id: 'goals', routeName: 'goals', activeRouteNames: ['goals', 'goals-completed', 'goals-archived', 'goal-detail'], label: t('goals.title'), icon: Coin },
  { id: 'budgets', routeName: 'budgets', label: t('budgets.title'), icon: Coin },
  { id: 'reports', routeName: 'reports', label: t('reports.title'), icon: DataAnalysis },
])

async function navigate(routeName) {
  navigationOpen.value = false
  await router.push({ name: routeName })
}

async function signOut() {
  await sessionStore.logout()
  await router.push({ name: 'sign-in' })
}

async function onPasswordDialogClosed({ passwordChanged }) {
  if (!passwordChanged) {
    headerRef.value?.focusAccount()
    return
  }

  try {
    await sessionStore.logout()
  } catch {
    // The store clears local authentication even if the logout request fails.
  }
  await router.replace({ name: 'sign-in' })
}
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">{{ t('app.skipToContent') }}</a>
    <AppHeader
      ref="headerRef"
      :user="sessionStore.user"
      @open-navigation="navigationOpen = true"
      @edit-profile="profileOpen = true"
      @change-password="passwordOpen = true"
      @account-data="router.push({ name: 'account-data-settings' })"
      @sign-out="signOut"
    />
    <ProfileDialog
      v-model="profileOpen"
      :user="sessionStore.user"
      @closed="headerRef?.focusAccount()"
    />
    <ChangePasswordDialog
      v-model="passwordOpen"
      @closed="onPasswordDialogClosed"
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
        <p class="drawer-title">{{ t('app.navigation') }}</p>
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
