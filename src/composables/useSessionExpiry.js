import { computed, onMounted, onUnmounted, shallowRef } from 'vue'

export function useSessionExpiry(sessionStore) {
  const now = shallowRef(Date.now())
  let timerId = null

  const idleExpiresAt = computed(() =>
    sessionStore.session?.idle_expires_at ? new Date(sessionStore.session.idle_expires_at).getTime() : null,
  )
  const absoluteExpiresAt = computed(() =>
    sessionStore.session?.absolute_expires_at ? new Date(sessionStore.session.absolute_expires_at).getTime() : null,
  )
  const secondsUntilIdleExpiry = computed(() => {
    if (!idleExpiresAt.value) {
      return null
    }

    return Math.max(0, Math.ceil((idleExpiresAt.value - now.value) / 1000))
  })
  const showWarning = computed(
    () => secondsUntilIdleExpiry.value !== null && secondsUntilIdleExpiry.value <= 60,
  )
  const isExpired = computed(() => {
    const absoluteExpired = absoluteExpiresAt.value !== null && now.value >= absoluteExpiresAt.value
    const idleExpired = idleExpiresAt.value !== null && now.value >= idleExpiresAt.value

    return absoluteExpired || idleExpired
  })

  onMounted(() => {
    timerId = window.setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })

  onUnmounted(() => {
    if (timerId) {
      window.clearInterval(timerId)
    }
  })

  return {
    secondsUntilIdleExpiry,
    showWarning,
    isExpired,
  }
}
