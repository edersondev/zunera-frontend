import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ZxcvbnFactory } from '@zxcvbn-ts/core'
import { adjacencyGraphs, dictionary } from '@zxcvbn-ts/language-common'

const scorer = new ZxcvbnFactory({ graphs: adjacencyGraphs, dictionary })
const labelKeys = [
  'auth.strengthVeryWeak',
  'auth.strengthWeak',
  'auth.strengthFair',
  'auth.strengthStrong',
  'auth.strengthVeryStrong',
]

/** @param {string} password @param {string[]} [userInputs] @returns {number | null} */
export function evaluatePasswordStrength(password, userInputs = []) {
  if (!password) return null
  return scorer.check(password, userInputs.filter(Boolean)).score
}

/** @param {import("vue").Ref<string>} password @param {import("vue").Ref<string[]>} [userInputs] */
export function usePasswordStrength(password, userInputs) {
  const { t } = useI18n()
  const score = computed(() => evaluatePasswordStrength(password.value, userInputs?.value ?? []))
  const label = computed(() => score.value === null ? '' : t(labelKeys[score.value]))
  const feedback = computed(() => {
    if (score.value === null || score.value >= 3) return ''
    return t('auth.strengthFeedback')
  })
  return { score, label, feedback }
}
