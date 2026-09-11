<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
})

const { t } = useI18n()
</script>

<template>
  <p class="password-help" :class="{ 'password-help-compact': compact }">
    {{ t('auth.passwordHelp') }}
  </p>
</template>

<style scoped>
.password-help {
  margin: -8px 0 16px;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.password-help-compact {
  margin-bottom: 8px;
}
</style>
