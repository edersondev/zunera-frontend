export const ACCOUNT_TYPES = Object.freeze([
  { value: 'checking', label: 'Conta corrente' },
  { value: 'savings', label: 'Conta poupança' },
  { value: 'cash_wallet', label: 'Dinheiro ou carteira' },
  { value: 'investment', label: 'Conta de investimento' },
  { value: 'digital', label: 'Conta digital' },
  { value: 'other', label: 'Outro' },
])

export const COLOR_OPTIONS = Object.freeze([
  { value: 'teal', label: 'Verde-azulado' },
  { value: 'blue', label: 'Azul' },
  { value: 'violet', label: 'Violeta' },
  { value: 'amber', label: 'Âmbar' },
  { value: 'rose', label: 'Rosa' },
  { value: 'cyan', label: 'Ciano' },
])

export const ICON_OPTIONS = Object.freeze([
  { value: 'bank', label: 'Banco' },
  { value: 'piggy_bank', label: 'Cofrinho' },
  { value: 'wallet', label: 'Carteira' },
  { value: 'chart', label: 'Gráfico' },
  { value: 'smartphone', label: 'Celular' },
  { value: 'circle', label: 'Círculo' },
])

export const ACCOUNT_TYPE_LABELS = Object.freeze(
  Object.fromEntries(ACCOUNT_TYPES.map((option) => [option.value, option.label])),
)

export const COLOR_LABELS = Object.freeze(
  Object.fromEntries(COLOR_OPTIONS.map((option) => [option.value, option.label])),
)

export const ICON_LABELS = Object.freeze(
  Object.fromEntries(ICON_OPTIONS.map((option) => [option.value, option.label])),
)
