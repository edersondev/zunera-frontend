<script setup>
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
  series: {
    type: Array,
    required: true,
  },
  options: {
    type: Object,
    required: true,
  },
  theme: {
    type: Object,
    required: true,
  },
  height: {
    type: [Number, String],
    default: 320,
  },
  label: {
    type: String,
    required: true,
  },
})

const chartOptions = computed(() => {
  const options = props.options
  const xaxis = options.xaxis ?? {}
  const yaxis = options.yaxis ?? {}

  return {
    ...options,
    chart: {
      fontFamily: 'inherit',
      foreColor: props.theme.textMuted,
      toolbar: { show: false },
      animations: { enabled: true },
      ...options.chart,
    },
    grid: {
      borderColor: props.theme.border,
      strokeDashArray: 3,
      ...options.grid,
    },
    legend: {
      labels: { colors: props.theme.text },
      ...options.legend,
    },
    tooltip: {
      theme: props.theme.mode,
      ...options.tooltip,
    },
    xaxis: {
      ...xaxis,
      labels: {
        style: { colors: props.theme.textMuted },
        ...xaxis.labels,
      },
    },
    yaxis: {
      ...yaxis,
      labels: {
        style: { colors: props.theme.textMuted },
        ...yaxis.labels,
      },
    },
  }
})
</script>

<template>
  <div class="base-chart" role="img" :aria-label="label">
    <VueApexCharts
      :type="type"
      :series="series"
      :options="chartOptions"
      :height="height"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.base-chart {
  min-width: 0;
}
</style>
