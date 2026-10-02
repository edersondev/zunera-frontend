<script setup>
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePasswordStrength } from '@/composables/usePasswordStrength'

const props = defineProps({
  password: { type: String, required: true },
  userInputs: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
})
const { t } = useI18n()
const { score, label, feedback } = usePasswordStrength(toRef(props, 'password'), toRef(props, 'userInputs'))
const tone = computed(() => {
  if (score.value === null) return 'var(--color-border-strong)'
  if (score.value <= 1) return 'var(--color-danger)'
  if (score.value === 2) return 'var(--color-warning)'
  return 'var(--color-success)'
})
const width = computed(() => score.value === null ? '0%' : `${(score.value + 1) * 20}%`)
</script>

<template>
  <div class="password-strength" :class="{ 'password-strength--compact': compact }">
    <div
      class="password-strength__track"
      role="progressbar"
      :aria-label="t('auth.passwordStrength')"
      aria-valuemin="0"
      aria-valuemax="4"
      :aria-valuenow="score ?? 0"
      :aria-valuetext="label || t('auth.strengthNotEntered')"
    >
      <div class="password-strength__fill" :style="{ width, backgroundColor: tone }" />
    </div>
    <p class="password-strength__label" aria-live="polite" aria-atomic="true">
      {{ label || t('auth.strengthNotEntered') }}
    </p>
    <p class="password-strength__feedback">{{ feedback }}</p>
  </div>
</template>

<style scoped>
.password-strength {
  margin: -6px 0 14px;
  min-width: 0;
}
.password-strength--compact {
  margin-bottom: 8px;
}
.password-strength__track {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-surface-tertiary);
}
.password-strength__fill {
  height: 100%;
  border-radius: inherit;
  transition: width 120ms ease;
}
.password-strength__label,
.password-strength__feedback {
  margin: 4px 0 0;
  min-height: 20px;
  color: var(--color-text-subtle);
  font-size: 14px;
  line-height: 20px;
}
.password-strength__feedback {
  color: var(--color-text-muted);
}
@media (prefers-reduced-motion: reduce) {
  .password-strength__fill { transition: none; }
}
</style>
