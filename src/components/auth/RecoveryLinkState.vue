<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  code: {
    type: String,
    default: '',
  },
})
const { t } = useI18n()
</script>

<template>
  <ElAlert
    v-if="code === 'recovery_link_expired'"
    class="link-state"
    type="warning"
    :title="t('auth.recoveryExpired')"
    :description="t('auth.recoveryExpiredDescription')"
    show-icon
  />
  <ElAlert
    v-else-if="code === 'recovery_link_invalid'"
    class="link-state"
    type="error"
    :title="t('auth.recoveryInvalid')"
    :description="t('auth.recoveryInvalidDescription')"
    show-icon
  />
</template>

<style scoped>
.link-state {
  margin-bottom: 16px;
}
</style>
