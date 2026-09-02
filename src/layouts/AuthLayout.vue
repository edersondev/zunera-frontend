<script setup>
import PrivacyNoticeLinks from '@/components/auth/PrivacyNoticeLinks.vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <main class="auth-page">
    <section class="auth-panel" aria-labelledby="auth-title">
      <p class="brand">Zunera</p>
      <h1 id="auth-title" class="auth-title">{{ title }}</h1>
      <p class="auth-subtitle">{{ subtitle }}</p>
      <PrivacyNoticeLinks />
      <slot />
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background: var(--color-canvas);
}

.auth-panel {
  width: min(100%, 440px);
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.brand {
  margin: 0 0 16px;
  color: var(--color-action-primary);
  font-size: 20px;
  font-weight: 700;
}

.auth-title {
  margin: 0;
  color: var(--color-text);
  font-size: 30px;
  line-height: 36px;
}

.auth-subtitle {
  margin: 8px 0 20px;
  color: var(--color-text-muted);
  font-size: 16px;
  line-height: 24px;
}
</style>
