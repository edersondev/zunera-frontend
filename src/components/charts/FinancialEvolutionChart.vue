<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseChart from '@/components/charts/BaseChart.vue'
import { useChartTheme } from '@/composables/useChartTheme'
import { formatDashboardCurrency } from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({
  evolution: {
    type: Object,
    required: true,
  },
  locale: {
    type: String,
    default: 'pt-BR',
  },
})

const { t } = useI18n()
const { theme } = useChartTheme()
const intervals = computed(() => props.evolution?.intervals ?? [])

const series = computed(() => [
  {
    name: t('dashboard.evolution.income'),
    data: intervals.value.map((interval) => interval.income?.amount_centavos ?? 0),
  },
  {
    name: t('dashboard.evolution.expenses'),
    data: intervals.value.map((interval) => interval.expenses?.amount_centavos ?? 0),
  },
])

const options = computed(() => ({
  colors: [theme.value.income, theme.value.expense],
  chart: {
    type: 'area',
    stacked: false,
  },
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 0.25,
      opacityFrom: 0.35,
      opacityTo: 0.04,
      stops: [0, 90, 100],
    },
  },
  dataLabels: { enabled: false },
  markers: { size: 0, hover: { sizeOffset: 4 } },
  xaxis: {
    categories: intervals.value.map((interval) => interval.label),
    tickPlacement: 'on',
    tooltip: { enabled: false },
  },
  yaxis: {
    labels: {
      formatter: (value) => formatDashboardCurrency(value, { locale: props.locale }),
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: (value, context) => {
        const interval = intervals.value[context.dataPointIndex]
        const result = interval?.result?.amount_centavos ?? 0
        const amount = formatDashboardCurrency(value, { locale: props.locale })
        const resultLabel = context.seriesIndex === 1
          ? ` · ${t('dashboard.evolution.result')}: ${formatDashboardCurrency(result, { locale: props.locale })}`
          : ''

        return `${amount}${resultLabel}`
      },
    },
  },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
  },
}))

const chartLabel = computed(() => t('dashboard.evolution.chartDescription'))
</script>

<template>
  <div class="evolution-chart" data-test="dashboard-evolution-chart">
    <BaseChart
      type="area"
      :series="series"
      :options="options"
      :theme="theme"
      :label="chartLabel"
      :height="340"
    />

    <p class="sr-only" data-test="dashboard-evolution-text-alternative">
      {{ chartLabel }}
      <span v-for="interval in intervals" :key="`${interval.from}-${interval.to}`">
        {{ interval.label }}: {{ t('dashboard.evolution.income') }}
        {{ formatDashboardCurrency(interval.income?.amount_centavos ?? 0, { locale }) }};
        {{ t('dashboard.evolution.expenses') }}
        {{ formatDashboardCurrency(interval.expenses?.amount_centavos ?? 0, { locale }) }};
        {{ t('dashboard.evolution.result') }}
        {{ formatDashboardCurrency(interval.result?.amount_centavos ?? 0, { locale }) }}.
      </span>
    </p>
  </div>
</template>

<style scoped>
.evolution-chart {
  min-width: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
