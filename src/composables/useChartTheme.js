import { computed, onMounted, onUnmounted, ref } from 'vue'

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

function readTheme() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      mode: 'light',
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

  const mediaQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

  return {
    mode: mediaQuery?.matches ? 'dark' : 'light',
    ...colors,
  }
}

export function useChartTheme() {
  const revision = ref(0)
  let mediaQuery

  function refresh() {
    revision.value += 1
  }

  onMounted(() => {
    if (typeof window.matchMedia !== 'function') return

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', refresh)
    refresh()
  })

  onUnmounted(() => {
    mediaQuery?.removeEventListener('change', refresh)
  })

  const theme = computed(() => {
    revision.value
    return readTheme()
  })

  return { theme }
}
