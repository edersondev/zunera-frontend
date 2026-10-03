<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  email: { type: String, required: true },
})

const { t } = useI18n()
</script>

<template>
  <ElAlert type="info" :title="t('auth.activationCheckEmail')" :description="t('auth.activationPending')" show-icon />
  <p class="activation-email">{{ email }}</p>
  <p class="activation-hint">{{ t('auth.activationMailHint') }}</p>
  <RouterLink class="auth-link" :to="{ name: 'activate-account', query: { email } }">
    {{ t('auth.resendActivation') }}
  </RouterLink>
</template>

<style scoped>
.activation-email {
  margin: 16px 0 8px;
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-weight: 600;
}

.activation-hint {
  margin: 0 0 16px;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}
</style>
