import {
  Briefcase,
  Calendar,
  Cellphone,
  Coin,
  CreditCard,
  FirstAidKit,
  ForkSpoon,
  House,
  Lightning,
  Money,
  MoreFilled,
  OfficeBuilding,
  Present,
  Reading,
  RefreshLeft,
  ShoppingBag,
  Suitcase,
  Tickets,
  TrendCharts,
  Trophy,
  Van,
  Wallet,
} from '@element-plus/icons-vue'

export const ICON_COMPONENTS = Object.freeze({
  bank: OfficeBuilding,
  piggy_bank: Coin,
  wallet: Wallet,
  chart: TrendCharts,
  smartphone: Cellphone,
  circle: MoreFilled,
  credit_card: CreditCard,
  cash: Money,
  briefcase: Briefcase,
  home: House,
  utensils: ForkSpoon,
  car: Van,
  heart: FirstAidKit,
  book: Reading,
  gamepad: Trophy,
  shopping_bag: ShoppingBag,
  receipt: Tickets,
  landmark: OfficeBuilding,
  gift: Present,
  refund: RefreshLeft,
  travel: Suitcase,
  subscription: Calendar,
  utilities: Lightning,
})

export const ICON_CONTEXTS = Object.freeze({
  financialAccounts: Object.freeze([
    'bank',
    'piggy_bank',
    'wallet',
    'chart',
    'smartphone',
    'circle',
    'credit_card',
    'cash',
    'briefcase',
  ]),
  categories: Object.freeze([
    'home',
    'utensils',
    'car',
    'heart',
    'book',
    'gamepad',
    'shopping_bag',
    'receipt',
    'landmark',
    'circle',
    'wallet',
    'briefcase',
    'chart',
    'gift',
    'refund',
    'bank',
    'piggy_bank',
    'credit_card',
    'smartphone',
    'cash',
    'travel',
    'subscription',
    'utilities',
  ]),
  creditCards: Object.freeze([
    'credit_card',
    'bank',
    'wallet',
    'smartphone',
    'circle',
    'shopping_bag',
    'travel',
    'subscription',
    'gift',
  ]),
})

export function iconComponent(value) {
  return ICON_COMPONENTS[value] ?? MoreFilled
}

export function iconLabel(context, value, t) {
  return ICON_CONTEXTS[context]?.includes(value) ? t(`${context}.icons.${value}`) : value || ''
}

export function iconOptions(context, t) {
  return (ICON_CONTEXTS[context] ?? []).map((value) => ({
    value,
    label: iconLabel(context, value, t),
    icon: iconComponent(value),
  }))
}
