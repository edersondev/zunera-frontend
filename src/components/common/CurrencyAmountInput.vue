<script setup>
import { computed, ref, watch } from 'vue'
import { vMaska } from 'maska/vue'
import { useLocale } from '@/composables/useLocale'
import { parseBRLToCentavos } from '@/utils/financial-accounts/currency'

const props = defineProps({
  modelValue: { type: Number, default: null },
  name: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  allowNegative: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const { activeLocale } = useLocale()

const displayValue = ref(formatCentavos(props.modelValue))
const placeholder = computed(() => formatCentavos(0))
const currencyMask = computed(() => ({
  number: {
    locale: activeLocale.value,
    fraction: 2,
    unsigned: !props.allowNegative,
  },
  preProcess: (value) => normalizeCurrencyInput(value, activeLocale.value),
}))

watch(
  () => [props.modelValue, activeLocale.value],
  ([value]) => {
    const formatted = formatCentavos(value)
    if (formatted !== displayValue.value) displayValue.value = formatted
  },
)

watch(displayValue, (value) => {
  const nextValue = value === '' || value === '-' ? null : parseBRLToCentavos(value)
  if (nextValue !== props.modelValue) emit('update:modelValue', nextValue)
})

function formatCentavos(value) {
  if (value === null || value === undefined) return ''

  return (Number(value) / 100).toLocaleString(activeLocale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function normalizeCurrencyInput(value, locale) {
  const raw = String(value)
  const negative = raw.startsWith('-')
  const digits = raw.replace(/\D/g, '')

  if (!digits) return negative && props.allowNegative ? '-' : ''

  const padded = digits.padStart(3, '0')
  const decimalSeparator = new Intl.NumberFormat(locale)
    .formatToParts(1.1)
    .find((part) => part.type === 'decimal')?.value ?? ','

  return `${negative && props.allowNegative ? '-' : ''}${padded.slice(0, -2)}${decimalSeparator}${padded.slice(-2)}`
}
</script>

<template>
  <ElInput
    v-model="displayValue"
    v-maska="currencyMask"
    :name="props.name"
    inputmode="decimal"
    autocomplete="off"
    :disabled="props.disabled"
    :placeholder="placeholder"
  >
    <template #prefix><span class="currency-prefix">R$</span></template>
  </ElInput>
</template>

<style scoped>
.currency-prefix {
  margin-right: 4px;
}
</style>
