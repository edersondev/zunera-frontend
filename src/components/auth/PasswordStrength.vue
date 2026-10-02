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
  if (score.value === null) return 'bg-[var(--color-border-strong)]'
  if (score.value <= 1) return 'bg-[var(--color-danger)]'
  if (score.value === 2) return 'bg-[var(--color-warning)]'
  return 'bg-[var(--color-success)]'
})
const width = computed(() => score.value === null ? '0%' : `${(score.value + 1) * 20}%`)
</script>

<template>
  <div class="-mt-1.5 min-w-0" :class="compact ? 'mb-2' : 'mb-3.5'">
    <div
      class="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-tertiary)]"
      role="progressbar"
      :aria-label="t('auth.passwordStrength')"
      aria-valuemin="0"
      aria-valuemax="4"
      :aria-valuenow="score ?? 0"
      :aria-valuetext="label || t('auth.strengthNotEntered')"
    >
      <div
        class="h-full rounded-full transition-[width] duration-150 ease-in-out motion-reduce:transition-none"
        :class="tone"
        :style="{ width }"
      />
    </div>
    <p class="m-0 mt-1 min-h-5 text-sm leading-5 text-[var(--color-text-subtle)]" aria-live="polite" aria-atomic="true">
      {{ label || t('auth.strengthNotEntered') }}
    </p>
    <p class="m-0 mt-1 min-h-5 text-sm leading-5 text-[var(--color-text-muted)]">{{ feedback }}</p>
  </div>
</template>

