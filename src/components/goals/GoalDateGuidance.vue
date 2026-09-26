<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatBRL } from '@/utils/financial-accounts/currency'

const props = defineProps({ goal: { type: Object, required: true } })
const { t, locale } = useI18n()
const formattedDate = computed(() => props.goal.target_date ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(`${props.goal.target_date}T12:00:00`)) : null)
</script>

<template>
  <section v-if="props.goal.target_date" class="guidance" :aria-label="t('goals.dateGuidance')">
    <p>{{ t('goals.targetDateLabel', { date: formattedDate }) }} · {{ t(`goals.dateState.${props.goal.target_date_state}`) }}</p>
    <p v-if="props.goal.suggested_monthly_centavos !== null">{{ t('goals.monthlySuggestion', { amount: formatBRL(props.goal.suggested_monthly_centavos), months: props.goal.contribution_periods_remaining }) }}</p>
    <p class="guidance-note">{{ t('goals.guidanceDisclaimer') }}</p>
  </section>
</template>

<style scoped>
.guidance { display: grid; gap: 6px; color: var(--color-text); }
.guidance p { margin: 0; }
.guidance-note { color: var(--color-text-muted); font-size: 14px; }
</style>
