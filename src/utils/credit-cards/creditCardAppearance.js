import { Cellphone, CreditCard, MoreFilled, OfficeBuilding, Wallet } from '@element-plus/icons-vue'

export const CREDIT_CARD_COLORS = Object.freeze(['teal', 'blue', 'violet', 'amber', 'rose', 'cyan'])
export const CREDIT_CARD_ICONS = Object.freeze(['credit_card', 'bank', 'wallet', 'smartphone', 'circle'])

export const CREDIT_CARD_ICON_COMPONENTS = Object.freeze({
  credit_card: CreditCard,
  bank: OfficeBuilding,
  wallet: Wallet,
  smartphone: Cellphone,
  circle: MoreFilled,
})

export function creditCardColorLabel(value, t) {
  return CREDIT_CARD_COLORS.includes(value) ? t(`creditCards.colors.${value}`) : value
}

export function creditCardIconLabel(value, t) {
  return CREDIT_CARD_ICONS.includes(value) ? t(`creditCards.icons.${value}`) : value
}

export function creditCardColorStyle(color) {
  return { backgroundColor: `var(--chart-${color}, var(--color-surface-tertiary))` }
}
