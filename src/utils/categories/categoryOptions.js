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

export const CATEGORY_CLASSIFICATIONS = Object.freeze([
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
])

export const CATEGORY_COLORS = Object.freeze([
  { value: 'teal', label: 'Verde-azulado' },
  { value: 'blue', label: 'Azul' },
  { value: 'violet', label: 'Violeta' },
  { value: 'amber', label: 'Âmbar' },
  { value: 'rose', label: 'Rosa' },
  { value: 'cyan', label: 'Ciano' },
])

export const CATEGORY_ICONS = Object.freeze([
  { value: 'home', label: 'Casa' },
  { value: 'utensils', label: 'Alimentação' },
  { value: 'car', label: 'Carro' },
  { value: 'heart', label: 'Saúde' },
  { value: 'book', label: 'Educação' },
  { value: 'gamepad', label: 'Entretenimento' },
  { value: 'shopping_bag', label: 'Compras' },
  { value: 'receipt', label: 'Contas' },
  { value: 'landmark', label: 'Impostos' },
  { value: 'circle', label: 'Outro' },
  { value: 'wallet', label: 'Carteira' },
  { value: 'briefcase', label: 'Serviços' },
  { value: 'chart', label: 'Investimentos' },
  { value: 'gift', label: 'Presentes' },
  { value: 'refund', label: 'Reembolsos' },
])

export const CLASSIFICATION_LABELS = Object.freeze(
  Object.fromEntries(CATEGORY_CLASSIFICATIONS.map((item) => [item.value, item.label])),
)
export const COLOR_LABELS = Object.freeze(
  Object.fromEntries(CATEGORY_COLORS.map((item) => [item.value, item.label])),
)
export const ICON_LABELS = Object.freeze(
  Object.fromEntries(CATEGORY_ICONS.map((item) => [item.value, item.label])),
)

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
