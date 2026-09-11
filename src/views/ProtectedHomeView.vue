<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/auth/sessionStore'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'

const router = useRouter()
const sessionStore = useSessionStore()
const { t } = useI18n()
const { activeLocale } = useLocale()
const displayName = computed(() => sessionStore.user?.name?.trim() || sessionStore.user?.email || t('common.currentUser'))

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(activeLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''
}

async function signOut() {
  await sessionStore.logout()
  await router.push({ name: 'sign-in' })
}
</script>

<template>
  <section class="protected-panel" aria-labelledby="protected-title">
    <h1 id="protected-title" class="protected-title">{{ t('app.accountReady') }}</h1>
    <p class="protected-copy">
      {{ t('app.signedInAs', { name: displayName }) }}
    </p>
    <RouterLink class="accounts-link" :to="{ name: 'financial-accounts' }">
      {{ t('app.openAccounts') }}
    </RouterLink>
    <dl class="session-details">
      <div>
        <dt>{{ t('app.idleExpires') }}</dt>
        <dd>{{ formatDate(sessionStore.session?.idle_expires_at) }}</dd>
      </div>
      <div>
        <dt>{{ t('app.absoluteExpires') }}</dt>
        <dd>{{ formatDate(sessionStore.session?.absolute_expires_at) }}</dd>
      </div>
    </dl>
    <ElButton type="primary" :loading="sessionStore.loading" @click="signOut">
      {{ t('common.signOut') }}
    </ElButton>
  </section>
</template>

<style scoped>
.protected-panel {
  max-width: 640px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.protected-title {
  margin: 0;
  color: var(--color-text);
  font-size: 30px;
  line-height: 36px;
}

.protected-copy {
  margin: 8px 0 24px;
  color: var(--color-text-muted);
}

.accounts-link {
  display: inline-block;
  margin-bottom: 24px;
  font-weight: 600;
}

.session-details {
  display: grid;
  gap: 12px;
  margin: 0 0 24px;
  color: var(--color-text-subtle);
  font-size: 14px;
}

.session-details div {
  display: grid;
  gap: 4px;
}

.session-details dt {
  font-weight: 700;
}

.session-details dd {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
