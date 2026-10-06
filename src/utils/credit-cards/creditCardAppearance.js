import { ICON_COMPONENTS, ICON_CONTEXTS, iconLabel } from '@/utils/icons/iconRegistry'

export const CREDIT_CARD_COLORS = Object.freeze(['teal', 'blue', 'violet', 'amber', 'rose', 'cyan'])
export const CREDIT_CARD_ICONS = ICON_CONTEXTS.creditCards
export const CREDIT_CARD_ICON_COMPONENTS = ICON_COMPONENTS

export function creditCardColorLabel(value, t) {
  return CREDIT_CARD_COLORS.includes(value) ? t(`creditCards.colors.${value}`) : value
}

export function creditCardIconLabel(value, t) {
  return iconLabel('creditCards', value, t)
}

export function creditCardColorStyle(color) {
  return { backgroundColor: `var(--chart-${color}, var(--color-surface-tertiary))` }
}
