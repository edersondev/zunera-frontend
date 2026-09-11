<script setup>
import { useRouter } from 'vue-router'
import { useSessionExpiry } from '@/composables/useSessionExpiry'
import { useSessionStore } from '@/stores/auth/sessionStore'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const sessionStore = useSessionStore()
const expiry = useSessionExpiry(sessionStore)
const { t } = useI18n()

async function continueSession() {
  await sessionStore.continueCurrentSession()
}

async function signOut() {
  await sessionStore.logout()
  await router.push({ name: 'sign-in' })
}
</script>

<template>
  <ElDialog
    :model-value="expiry.showWarning.value"
    :title="t('auth.sessionEnding')"
    width="min(92vw, 420px)"
    :close-on-click-modal="false"
    :show-close="false"
    align-center
  >
    <p class="dialog-copy">
      {{ t('auth.sessionExpiresIn', { seconds: expiry.secondsUntilIdleExpiry.value }) }}
    </p>
    <template #footer>
      <ElButton @click="signOut">{{ t('common.signOut') }}</ElButton>
      <ElButton type="primary" :loading="sessionStore.loading" @click="continueSession">
        {{ t('auth.continueSession') }}
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
