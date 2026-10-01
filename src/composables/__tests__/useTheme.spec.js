import { afterEach, describe, expect, it, vi } from 'vitest'

const originalMatchMedia = window.matchMedia

afterEach(() => {
  window.matchMedia = originalMatchMedia
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('theme preference', () => {
  it('switches page and charts together, follows system only when chosen, and syncs other tabs', async () => {
    vi.resetModules()
    let notifyMediaChange
    const media = {
      matches: false,
      addEventListener: vi.fn((_event, listener) => { notifyMediaChange = listener }),
    }
    window.matchMedia = vi.fn(() => media)
    const { useTheme } = await import('../useTheme')
    const { useChartTheme } = await import('../useChartTheme')
    const { preference, activeTheme, setTheme } = useTheme()
    const { theme: chartTheme } = useChartTheme()

    expect(preference.value).toBe('system')
    expect(activeTheme.value).toBe('light')
    expect(chartTheme.value.mode).toBe('light')

    notifyMediaChange({ matches: true })
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(chartTheme.value.mode).toBe('dark')

    setTheme('light')
    expect(window.localStorage.getItem('zunera.theme')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(chartTheme.value.mode).toBe('light')
    notifyMediaChange({ matches: false })
    expect(activeTheme.value).toBe('light')

    setTheme('dark')
    expect(chartTheme.value.mode).toBe('dark')
    window.localStorage.setItem('zunera.theme', 'system')
    window.dispatchEvent(new StorageEvent('storage', { key: 'zunera.theme' }))
    expect(preference.value).toBe('system')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(chartTheme.value.mode).toBe('light')
  })
})
