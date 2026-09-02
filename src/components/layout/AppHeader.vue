<script setup>
import { ArrowDown, Menu, UserFilled } from '@element-plus/icons-vue'

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['open-navigation', 'sign-out'])

function handleAccountCommand(command) {
  if (command === 'sign-out') {
    emit('sign-out')
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-start">
      <ElButton
        class="navigation-trigger"
        text
        :icon="Menu"
        aria-label="Open navigation"
        @click="emit('open-navigation')"
      />
      <RouterLink class="brand" :to="{ name: 'protected-home' }">Zunera</RouterLink>
    </div>

    <div class="header-end">
      <p class="workspace-context">
        <span>Workspace</span>
        <strong>Personal</strong>
      </p>

      <ElDropdown trigger="click" @command="handleAccountCommand">
        <ElButton
          class="account-menu"
          text
          :aria-label="`Account menu for ${props.user?.email ?? 'current user'}`"
        >
          <ElIcon><UserFilled /></ElIcon>
          <span class="account-email">{{ props.user?.email ?? 'Account' }}</span>
          <ElIcon class="account-chevron"><ArrowDown /></ElIcon>
        </ElButton>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem command="sign-out">Sign out</ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 32px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.header-start,
.header-end,
.account-menu {
  display: flex;
  align-items: center;
}

.header-start,
.header-end {
  gap: 16px;
}

.brand {
  color: var(--color-action-primary);
  font-size: 20px;
  font-weight: 700;
  text-decoration: none;
}

.brand:hover {
  color: var(--color-action-primary-hover);
  text-decoration: none;
}

.navigation-trigger {
  display: none;
  width: 44px;
  height: 44px;
  margin-left: -12px;
}

.workspace-context {
  display: grid;
  gap: 0;
  margin: 0;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
  text-align: right;
}

.workspace-context strong {
  color: var(--color-text);
  font-size: 14px;
  line-height: 20px;
}

.account-menu {
  min-height: 44px;
  gap: 8px;
  color: var(--color-text);
}

.account-email {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-chevron {
  color: var(--color-text-muted);
}

@media (max-width: 1023px) {
  .app-header {
    padding: 0 24px;
  }

  .navigation-trigger {
    display: inline-flex;
  }
}

@media (max-width: 639px) {
  .app-header {
    padding: 0 16px;
  }

  .workspace-context,
  .account-email,
  .account-chevron {
    display: none;
  }

  .account-menu {
    width: 44px;
    justify-content: center;
  }
}
</style>
