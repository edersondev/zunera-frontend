<script setup>
import { useI18n } from 'vue-i18n'

const privacyUrl = import.meta.env.VITE_PRIVACY_URL ?? '/privacy'
const privacyRightsUrl = import.meta.env.VITE_PRIVACY_RIGHTS_URL ?? '/privacy-rights'
const { t } = useI18n()
</script>

<template>
  <p class="privacy-links">
    {{ t('auth.privacy') }}
    <a :href="privacyUrl" class="auth-link">{{ t('auth.privacyNotice') }}</a>
    <span aria-hidden="true">·</span>
    <a :href="privacyRightsUrl" class="auth-link">{{ t('auth.privacyRights') }}</a>
  </p>
</template>

<style scoped>
.privacy-links {
  margin: 0 0 24px;
  color: var(--color-text-subtle);
  font-size: 14px;
  line-height: 20px;
}
</style>
