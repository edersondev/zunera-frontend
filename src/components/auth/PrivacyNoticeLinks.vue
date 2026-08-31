<script setup>
const privacyUrl = import.meta.env.VITE_PRIVACY_URL ?? '/privacy'
const privacyRightsUrl = import.meta.env.VITE_PRIVACY_RIGHTS_URL ?? '/privacy-rights'
</script>

<template>
  <p class="privacy-links">
    By continuing, you agree to Zunera privacy handling.
    <a :href="privacyUrl" class="auth-link">Privacy notice</a>
    <span aria-hidden="true">·</span>
    <a :href="privacyRightsUrl" class="auth-link">Privacy rights</a>
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
