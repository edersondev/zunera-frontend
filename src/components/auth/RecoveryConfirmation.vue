<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  email: {
    type: String,
    required: true,
  },
})
const { t } = useI18n()
</script>

<template>
  <ElAlert
    class="recovery-confirmation"
    type="success"
    :title="t('auth.checkEmail')"
    :description="t('auth.recoverySent')"
    show-icon
  />
  <p class="confirmation-email">{{ email }}</p>
  <RouterLink class="auth-link" :to="{ name: 'sign-in' }">{{ t('auth.returnToSignIn') }}</RouterLink>
</template>

<style scoped>
.recovery-confirmation {
  margin-bottom: 16px;
}

.confirmation-email {
  margin: 0 0 16px;
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
