export const ACCOUNT_TYPES = Object.freeze([
  { value: 'checking', label: 'Checking account' },
  { value: 'savings', label: 'Savings account' },
  { value: 'cash_wallet', label: 'Cash or wallet' },
  { value: 'investment', label: 'Investment account' },
  { value: 'digital', label: 'Digital account' },
  { value: 'other', label: 'Other' },
])

export const COLOR_OPTIONS = Object.freeze([
  { value: 'teal', label: 'Teal' },
  { value: 'blue', label: 'Blue' },
  { value: 'violet', label: 'Violet' },
  { value: 'amber', label: 'Amber' },
  { value: 'rose', label: 'Rose' },
  { value: 'cyan', label: 'Cyan' },
])

export const ICON_OPTIONS = Object.freeze([
  { value: 'bank', label: 'Bank' },
  { value: 'piggy_bank', label: 'Piggy bank' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'chart', label: 'Chart' },
  { value: 'smartphone', label: 'Smartphone' },
  { value: 'circle', label: 'Circle' },
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
