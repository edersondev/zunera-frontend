import {
  Briefcase,
  FirstAidKit,
  ForkSpoon,
  House,
  MoreFilled,
  OfficeBuilding,
  Present,
  Reading,
  RefreshLeft,
  ShoppingBag,
  Tickets,
  TrendCharts,
  Trophy,
  Van,
  Wallet,
} from '@element-plus/icons-vue'

export const CATEGORY_CLASSIFICATIONS = Object.freeze(['income', 'expense'])

export const CATEGORY_COLORS = Object.freeze(['teal', 'blue', 'violet', 'amber', 'rose', 'cyan'])

export const CATEGORY_ICONS = Object.freeze([
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
])

function localizedOptions(values, keyPrefix, t) {
  return values.map((value) => ({ value, label: t(`${keyPrefix}.${value}`) }))
}

export function categoryClassificationOptions(t) {
  return localizedOptions(CATEGORY_CLASSIFICATIONS, 'categories.classifications', t)
}

export function categoryColorOptions(t) {
  return localizedOptions(CATEGORY_COLORS, 'categories.colors', t)
}

export function categoryIconOptions(t) {
  return localizedOptions(CATEGORY_ICONS, 'categories.icons', t)
}

export function categoryClassificationLabel(value, t) {
  return CATEGORY_CLASSIFICATIONS.includes(value) ? t(`categories.classifications.${value}`) : value
}

export function categoryColorLabel(value, t) {
  return CATEGORY_COLORS.includes(value) ? t(`categories.colors.${value}`) : value
}

export function categoryIconLabel(value, t) {
  return CATEGORY_ICONS.includes(value) ? t(`categories.icons.${value}`) : value
}

export const CATEGORY_ICON_COMPONENTS = Object.freeze({
  home: House,
  utensils: ForkSpoon,
  car: Van,
  heart: FirstAidKit,
  book: Reading,
  gamepad: Trophy,
  shopping_bag: ShoppingBag,
  receipt: Tickets,
  landmark: OfficeBuilding,
  circle: MoreFilled,
  wallet: Wallet,
  briefcase: Briefcase,
  chart: TrendCharts,
  gift: Present,
  refund: RefreshLeft,
})

export function categoryColorStyle(color) {
  return { backgroundColor: `var(--chart-${color}, var(--color-surface-tertiary))` }
}
