<script setup>
import { useI18n } from 'vue-i18n'

const privacyUrl = import.meta.env.VITE_PRIVACY_URL ?? '/privacy'
const privacyRightsUrl = import.meta.env.VITE_PRIVACY_RIGHTS_URL ?? '/privacy-rights'
const { t } = useI18n()
</script>

<template>
  <div class="privacy-links">
    <p>{{ t('auth.privacy') }}</p>
    <ul>
      <li><a :href="privacyUrl" class="auth-link">{{ t('auth.privacyNotice') }}</a></li>
      <li><a :href="privacyRightsUrl" class="auth-link">{{ t('auth.privacyRights') }}</a></li>
    </ul>
  </div>
</template>

<style scoped>
.privacy-links {
  margin: 0 0 24px;
  color: var(--color-text-subtle);
  font-size: 14px;
  line-height: 20px;
}

.privacy-links p {
  margin: 0;
}

.privacy-links ul {
  margin: 8px 0 0;
  padding-left: 20px;
}

.privacy-links li + li {
  margin-top: 4px;
}
</style>
