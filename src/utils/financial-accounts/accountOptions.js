import { COLOR_VALUES, colorOptions } from '@/utils/colors/colorPalette'
import { ICON_CONTEXTS, iconOptions } from '@/utils/icons/iconRegistry'

export const ACCOUNT_TYPES = Object.freeze([
  'checking',
  'savings',
  'cash_wallet',
  'investment',
  'digital',
  'other',
])

export const ACCOUNT_COLORS = COLOR_VALUES

export const ACCOUNT_ICONS = ICON_CONTEXTS.financialAccounts

function localizedOptions(values, keyPrefix, t) {
  return values.map((value) => ({ value, label: t(`${keyPrefix}.${value}`) }))
}

export function accountTypeOptions(t) {
  return localizedOptions(ACCOUNT_TYPES, 'financialAccounts.accountTypes', t)
}

export function accountColorOptions(t) {
  return colorOptions(t)
}

export function accountIconOptions(t) {
  return iconOptions('financialAccounts', t)
}

export function accountTypeLabel(value, t) {
  return ACCOUNT_TYPES.includes(value) ? t(`financialAccounts.accountTypes.${value}`) : value
}
