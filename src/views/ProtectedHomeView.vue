<script setup>
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/auth/sessionStore'

const router = useRouter()
const sessionStore = useSessionStore()

async function signOut() {
  await sessionStore.logout()
  await router.push({ name: 'sign-in' })
}
</script>

<template>
  <section class="protected-panel" aria-labelledby="protected-title">
    <h1 id="protected-title" class="protected-title">Account ready</h1>
    <p class="protected-copy">
      Signed in as {{ sessionStore.user?.email }}.
    </p>
    <RouterLink class="accounts-link" :to="{ name: 'financial-accounts' }">
      Open financial accounts
    </RouterLink>
    <dl class="session-details">
      <div>
        <dt>Idle expires</dt>
        <dd>{{ sessionStore.session?.idle_expires_at }}</dd>
      </div>
      <div>
        <dt>Absolute expires</dt>
        <dd>{{ sessionStore.session?.absolute_expires_at }}</dd>
      </div>
    </dl>
    <ElButton type="primary" :loading="sessionStore.loading" @click="signOut">
      Sign out
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
