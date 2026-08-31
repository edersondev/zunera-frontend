<script setup>
import { useSessionExpiry } from '@/composables/useSessionExpiry'
import { useSessionStore } from '@/stores/auth/sessionStore'

const sessionStore = useSessionStore()
const expiry = useSessionExpiry(sessionStore)

async function continueSession() {
  await sessionStore.continueCurrentSession()
}

async function signOut() {
  await sessionStore.logout()
}
</script>

<template>
  <ElDialog
    :model-value="expiry.showWarning.value"
    title="Session ending soon"
    width="min(92vw, 420px)"
    :close-on-click-modal="false"
    :show-close="false"
    align-center
  >
    <p class="dialog-copy">
      Your session will expire in {{ expiry.secondsUntilIdleExpiry.value }} seconds.
    </p>
    <template #footer>
      <ElButton @click="signOut">Sign out</ElButton>
      <ElButton type="primary" :loading="sessionStore.loading" @click="continueSession">
        Continue session
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.dialog-copy {
  margin: 0;
  color: var(--color-text-subtle);
  font-size: 16px;
  line-height: 24px;
}
</style>
