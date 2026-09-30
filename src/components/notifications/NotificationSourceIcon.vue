<script setup>
import { Calendar, Coin, CreditCard, DataAnalysis } from '@element-plus/icons-vue'
import { computed } from 'vue'

const props = defineProps({ source: { type: String, required: true } })
const icon = computed(() => ({
  credit_cards: CreditCard,
  recurring_transactions: Calendar,
  recurring_card_purchases: Calendar,
  budgets: DataAnalysis,
  financial_goals: Coin,
})[props.source] ?? DataAnalysis)
</script>

<template>
  <span class="source-icon" aria-hidden="true"><ElIcon><component :is="icon" /></ElIcon></span>
</template>

<style scoped>
.source-icon { display: inline-flex; width: 36px; height: 36px; flex: none; align-items: center; justify-content: center; border-radius: var(--radius-md); background: var(--color-surface-secondary); color: var(--color-text-subtle); }
</style>
