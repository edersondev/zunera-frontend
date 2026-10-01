import { computed, readonly, shallowRef } from 'vue'

const STORAGE_KEY = 'zunera.theme'
const PREFERENCES = ['light', 'dark', 'system']

function storedPreference() {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return PREFERENCES.includes(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

const preference = shallowRef(storedPreference())
const systemDark = shallowRef(false)
const activeTheme = computed(() => preference.value === 'system'
  ? (systemDark.value ? 'dark' : 'light')
  : preference.value)
let initialized = false

function applyTheme() {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = activeTheme.value
}

export function initializeTheme() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  if (typeof window.matchMedia === 'function') {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = media.matches
    media.addEventListener('change', (event) => {
      systemDark.value = event.matches
      applyTheme()
    })
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    preference.value = storedPreference()
    applyTheme()
  })
  applyTheme()
}

function setTheme(nextPreference) {
  if (!PREFERENCES.includes(nextPreference)) return
  preference.value = nextPreference
  applyTheme()
  try {
    window.localStorage.setItem(STORAGE_KEY, nextPreference)
  } catch {
    // Keep the selected theme for this page when storage is unavailable.
  }
}

export function useTheme() {
  initializeTheme()
  return { preference: readonly(preference), activeTheme, setTheme }
}
