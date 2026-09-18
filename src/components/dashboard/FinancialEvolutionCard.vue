<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FinancialEvolutionChart from '@/components/charts/FinancialEvolutionChart.vue'

const props = defineProps({
  evolution: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Object,
    default: null,
  },
  locale: {
    type: String,
    default: 'pt-BR',
  },
})

const emit = defineEmits(['retry'])
const { t } = useI18n()

const intervals = computed(() => props.evolution?.intervals ?? [])
const intervalLabel = computed(() =>
  props.evolution?.interval ? t(`dashboard.evolution.${props.evolution.interval}`) : '',
)

const hasPartialIntervals = computed(() => intervals.value.some((interval) => interval.is_partial))
</script>

<template>
  <section class="dashboard-card" aria-labelledby="dashboard-evolution-title">
    <header class="card-header">
      <h2 id="dashboard-evolution-title" class="card-title">
        {{ t('dashboard.evolution.title') }}
      </h2>
      <p v-if="intervalLabel" class="card-meta" data-test="dashboard-evolution-interval">
        {{ t('dashboard.evolution.interval') }}: {{ intervalLabel }}
      </p>
    </header>

    <ElAlert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      :title="t('dashboard.states.error', { section: t('dashboard.sectionNames.evolution') })"
      data-test="dashboard-evolution-error"
    >
      <ElButton size="small" data-test="dashboard-evolution-retry" @click="emit('retry')">
        {{ t('dashboard.states.retry') }}
      </ElButton>
    </ElAlert>

    <ElSkeleton v-else-if="loading && !evolution" :rows="3" animated />

    <p v-else-if="intervals.length === 0" class="card-empty" data-test="dashboard-evolution-empty">
      {{ t('dashboard.evolution.empty') }}
    </p>

    <template v-else>
      <FinancialEvolutionChart :evolution="evolution" :locale="locale" />
      <p v-if="hasPartialIntervals" class="card-note" data-test="dashboard-evolution-partial">
        {{ t('dashboard.evolution.partialNote') }}
      </p>
    </template>
  </section>
</template>

<style scoped>
.dashboard-card {
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.card-title {
  margin: 0;
  color: var(--color-text);
  font-size: 20px;
  line-height: 28px;
}

.card-meta,
.card-empty,
.card-note {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}
</style>
