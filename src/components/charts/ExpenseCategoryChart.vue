<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseChart from '@/components/charts/BaseChart.vue'
import { useChartTheme } from '@/composables/useChartTheme'
import { formatDashboardCurrency } from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({
  categories: {
    type: Array,
    required: true,
  },
  locale: {
    type: String,
    default: 'pt-BR',
  },
})

const { t } = useI18n()
const { theme } = useChartTheme()

const segments = computed(() => {
  const leading = props.categories.slice(0, 8).map((entry) => ({
    id: entry.category.id,
    label: entry.category.name,
    amountCentavos: entry.total?.amount_centavos ?? 0,
  }))
  const remaining = props.categories.slice(8)

  if (remaining.length === 0) return leading

  return [
    ...leading,
    {
      id: 'other',
      label: t('dashboard.distribution.other'),
      amountCentavos: remaining.reduce(
        (sum, entry) => sum + (entry.total?.amount_centavos ?? 0),
        0,
      ),
    },
  ]
})

const total = computed(() =>
  segments.value.reduce((sum, segment) => sum + segment.amountCentavos, 0),
)

const series = computed(() => segments.value.map((segment) => segment.amountCentavos))

const options = computed(() => ({
  colors: [
    theme.value.chartTeal,
    theme.value.chartBlue,
    theme.value.chartViolet,
    theme.value.chartAmber,
    theme.value.chartRose,
    theme.value.chartCyan,
    theme.value.income,
    theme.value.expense,
    theme.value.textMuted,
  ],
  labels: segments.value.map((segment) => segment.label),
  chart: { type: 'donut' },
  legend: { show: false },
  dataLabels: { enabled: false },
  stroke: {
    colors: [theme.value.surface],
    width: 2,
  },
  plotOptions: {
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          name: { show: true, color: theme.value.textMuted },
          value: {
            show: true,
            color: theme.value.text,
            formatter: (value) => formatDashboardCurrency(value, { locale: props.locale }),
          },
          total: {
            show: true,
            label: t('dashboard.distribution.total'),
            color: theme.value.textMuted,
            formatter: () => formatDashboardCurrency(total.value, { locale: props.locale }),
          },
        },
      },
    },
  },
  tooltip: {
    y: {
      formatter: (value) => {
        const share = total.value > 0 ? (value / total.value) * 100 : 0
        return `${formatDashboardCurrency(value, { locale: props.locale })} (${share.toLocaleString(props.locale, { maximumFractionDigits: 1 })}%)`
      },
    },
  },
}))

const chartLabel = computed(() => t('dashboard.distribution.chartDescription'))
</script>

<template>
  <div class="expense-category-chart" data-test="dashboard-distribution-chart">
    <BaseChart
      type="donut"
      :series="series"
      :options="options"
      :theme="theme"
      :label="chartLabel"
      :height="300"
    />
  </div>
</template>

<style scoped>
.expense-category-chart {
  min-width: 0;
}
</style>
