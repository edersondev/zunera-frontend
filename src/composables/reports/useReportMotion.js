import { onMounted, onUnmounted, shallowRef } from 'vue'

export function useReportMotion() {
  const reducedMotion = shallowRef(false)
  let media
  const update = () => { reducedMotion.value = media.matches }

  onMounted(() => {
    if (typeof window.matchMedia !== 'function') return
    media = window.matchMedia('(prefers-reduced-motion: reduce)')
    update()
    media.addEventListener('change', update)
  })
  onUnmounted(() => media?.removeEventListener('change', update))

  return { reducedMotion }
}
