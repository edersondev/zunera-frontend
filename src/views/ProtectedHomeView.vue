<script setup>
import { useSessionStore } from '@/stores/auth/sessionStore'

const sessionStore = useSessionStore()

async function signOut() {
  await sessionStore.logout()
}
</script>

<template>
  <main class="protected-page">
    <section class="protected-panel" aria-labelledby="protected-title">
      <p class="brand">Zunera</p>
      <h1 id="protected-title" class="protected-title">Account ready</h1>
      <p class="protected-copy">
        Signed in as {{ sessionStore.user?.email }}.
      </p>
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
  </main>
</template>

<style scoped>
.protected-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background: var(--color-canvas);
}

.protected-panel {
  width: min(100%, 640px);
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.brand {
  margin: 0 0 16px;
  color: var(--color-action-primary);
  font-size: 20px;
  font-weight: 700;
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
