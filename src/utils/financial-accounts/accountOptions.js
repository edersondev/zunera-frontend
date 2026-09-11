export const ACCOUNT_TYPES = Object.freeze([
  'checking',
  'savings',
  'cash_wallet',
  'investment',
  'digital',
  'other',
])

export const ACCOUNT_COLORS = Object.freeze(['teal', 'blue', 'violet', 'amber', 'rose', 'cyan'])

export const ACCOUNT_ICONS = Object.freeze([
  'bank',
  'piggy_bank',
  'wallet',
  'chart',
  'smartphone',
  'circle',
])

function localizedOptions(values, keyPrefix, t) {
  return values.map((value) => ({ value, label: t(`${keyPrefix}.${value}`) }))
}

export function accountTypeOptions(t) {
  return localizedOptions(ACCOUNT_TYPES, 'financialAccounts.accountTypes', t)
}

export function accountColorOptions(t) {
  return localizedOptions(ACCOUNT_COLORS, 'financialAccounts.colors', t)
}

export function accountIconOptions(t) {
  return localizedOptions(ACCOUNT_ICONS, 'financialAccounts.icons', t)
}

export function accountTypeLabel(value, t) {
  return ACCOUNT_TYPES.includes(value) ? t(`financialAccounts.accountTypes.${value}`) : value
}
