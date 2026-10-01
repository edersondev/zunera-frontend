import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const chartColorVariables = {
  canvas: '--color-canvas',
  surface: '--color-surface',
  border: '--color-border',
  text: '--color-text',
  textMuted: '--color-text-muted',
  income: '--color-financial-positive',
  expense: '--color-financial-negative',
  chartTeal: '--chart-teal',
  chartBlue: '--chart-blue',
  chartViolet: '--chart-violet',
  chartAmber: '--chart-amber',
  chartRose: '--chart-rose',
  chartCyan: '--chart-cyan',
}

function readTheme(mode) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      mode,
      canvas: '#ffffff',
      surface: '#ffffff',
      border: '#dcdfe6',
      text: '#303133',
      textMuted: '#606266',
      income: '#16a34a',
      expense: '#dc2626',
      chartTeal: '#14b8a6',
      chartBlue: '#3b82f6',
      chartViolet: '#8b5cf6',
      chartAmber: '#f59e0b',
      chartRose: '#f43f5e',
      chartCyan: '#06b6d4',
    }
  }

  const styles = window.getComputedStyle(document.documentElement)
  const colors = Object.fromEntries(
    Object.entries(chartColorVariables).map(([name, variable]) => [
      name,
      styles.getPropertyValue(variable).trim(),
    ]),
  )

  return { mode, ...colors }
}

export function useChartTheme() {
  const { activeTheme } = useTheme()
  const theme = computed(() => readTheme(activeTheme.value))
  return { theme }
}
