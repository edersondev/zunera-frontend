<script setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import SessionExpiryDialog from '@/components/auth/SessionExpiryDialog.vue'
import { useSessionStore } from '@/stores/auth/sessionStore'
import { useSessionExpiry } from '@/composables/useSessionExpiry'

const router = useRouter()
const sessionStore = useSessionStore()
const expiry = useSessionExpiry(sessionStore)

watch(expiry.isExpired, async (expired) => {
  if (!expired || !sessionStore.isAuthenticated) {
    return
  }

  sessionStore.clearSession()
  await router.push({ name: 'sign-in', query: { expired: '1' } })
})
</script>

<template>
  <RouterView />
  <SessionExpiryDialog v-if="sessionStore.isAuthenticated" />
</template>

<style scoped></style>
