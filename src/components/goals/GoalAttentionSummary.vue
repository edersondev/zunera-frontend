<script setup>
import { computed } from 'vue'
import { CircleCheck, Warning } from '@element-plus/icons-vue'
import { ElIcon } from 'element-plus'
import { useI18n } from 'vue-i18n'

const props = defineProps({ counts: { type: Object, required: true } })
const { t } = useI18n()
const issues = computed(() => [
  ['overdue_underfunded_active_goals', 'overdueCount'],
  ['shortfall_linked_goals', 'shortfallCount'],
  ['inactive_or_unavailable_linked_goals', 'inactiveCount'],
].filter(([key]) => props.counts[key] > 0).map(([key, label]) => t(`goals.${label}`, { count: props.counts[key] })))
</script>

<template>
  <section class="goal-attention" :class="{ 'needs-attention': issues.length }" :aria-label="t('goals.attention')">
    <template v-if="issues.length">
      <h2><ElIcon aria-hidden="true"><Warning /></ElIcon>{{ t('goals.attention') }}</h2>
      <ul><li v-for="issue in issues" :key="issue">{{ issue }}</li></ul>
    </template>
    <p v-else class="all-clear"><ElIcon aria-hidden="true"><CircleCheck /></ElIcon><span>{{ t('goals.allClear') }}</span></p>
  </section>
</template>

<style scoped>
.goal-attention { padding: 12px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.goal-attention.needs-attention { border-left: 4px solid var(--color-warning); }
.goal-attention h2, .all-clear { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; }
.goal-attention h2 { color: var(--color-text); }
.goal-attention h2 .el-icon { color: var(--color-warning); }
.all-clear { color: var(--color-text-subtle); }
.all-clear .el-icon { color: var(--color-success); }
.goal-attention ul { display: grid; gap: 4px; margin: 8px 0 0; padding-left: 24px; color: var(--color-text-subtle); font-size: 14px; }
</style>
