<script setup>
import { useI18n } from 'vue-i18n'
import MonthNavigator from '@/components/common/MonthNavigator.vue'

defineProps({
  month: { type: Object, required: true },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['change-month'])
const { t } = useI18n()
</script>

<template>
  <MonthNavigator
    class="budget-month-navigator"
    :month="month"
    :loading="loading"
    :previous-label="t('budgets.month.previous')"
    :next-label="t('budgets.month.next')"
    test-prefix="budget-month"
    @change-month="emit('change-month', $event)"
  />
</template>
