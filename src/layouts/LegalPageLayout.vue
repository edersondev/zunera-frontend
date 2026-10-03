<script setup>
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'

defineProps({
  title: { type: String, required: true },
  intro: { type: String, required: true },
})

const { t } = useI18n()
const { activeLocale, setLocale } = useLocale()
</script>

<template>
  <main id="main-content" class="legal-page" tabindex="-1">
    <div class="legal-container">
      <header class="legal-header">
        <RouterLink class="brand" :to="{ name: 'sign-in' }">Zunera</RouterLink>
        <label class="language-selector" for="legal-language">
          <span>{{ t('common.language') }}</span>
          <select id="legal-language" :value="activeLocale" @change="setLocale($event.target.value)">
            <option value="pt-BR">{{ t('common.portuguese') }}</option>
            <option value="en">{{ t('common.english') }}</option>
          </select>
        </label>
      </header>

      <article class="legal-content" aria-labelledby="legal-title">
        <h1 id="legal-title">{{ title }}</h1>
        <p class="intro">{{ intro }}</p>
        <slot />
      </article>

      <nav class="legal-nav" :aria-label="t('legal.relatedPages')">
        <RouterLink :to="{ name: 'privacy' }">{{ t('auth.privacyNotice') }}</RouterLink>
        <RouterLink :to="{ name: 'privacy-rights' }">{{ t('auth.privacyRights') }}</RouterLink>
        <RouterLink :to="{ name: 'register' }">{{ t('legal.backToRegister') }}</RouterLink>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.legal-page {
  min-height: 100vh;
  padding: 24px 16px 48px;
  background: var(--color-canvas);
  color: var(--color-text);
}

.legal-container {
  width: min(100%, 760px);
  margin: 0 auto;
}

.legal-header,
.language-selector,
.legal-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legal-header {
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.brand {
  color: var(--color-action-primary);
  font-size: 20px;
  font-weight: 700;
}

.language-selector {
  color: var(--color-text-muted);
  font-size: 14px;
}

.language-selector select {
  min-height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
}

.legal-content {
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  line-height: 1.6;
}

.legal-content :deep(h1) {
  margin: 0 0 12px;
  font-size: 30px;
  line-height: 36px;
}

.legal-content :deep(h2) {
  margin: 32px 0 8px;
  font-size: 22px;
  line-height: 30px;
}

.legal-content :deep(p),
.legal-content :deep(ul),
.legal-content :deep(ol) {
  margin: 0 0 16px;
}

.legal-content :deep(li) {
  margin-bottom: 8px;
}

.intro {
  color: var(--color-text-subtle);
}

.legal-nav {
  flex-wrap: wrap;
  margin-top: 24px;
}

.legal-page :deep(a) {
  color: var(--color-action-primary);
  text-underline-offset: 3px;
}

.legal-page :deep(a:focus-visible),
.language-selector select:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 3px;
}

@media (max-width: 480px) {
  .legal-content {
    padding: 16px;
  }
}
</style>
