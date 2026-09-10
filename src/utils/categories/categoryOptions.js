export const CATEGORY_CLASSIFICATIONS = Object.freeze([
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
])

export const CATEGORY_COLORS = Object.freeze([
  { value: 'teal', label: 'Teal' },
  { value: 'blue', label: 'Blue' },
  { value: 'violet', label: 'Violet' },
  { value: 'amber', label: 'Amber' },
  { value: 'rose', label: 'Rose' },
  { value: 'cyan', label: 'Cyan' },
])

export const CATEGORY_ICONS = Object.freeze([
  { value: 'home', label: 'Home' },
  { value: 'utensils', label: 'Food' },
  { value: 'car', label: 'Car' },
  { value: 'heart', label: 'Health' },
  { value: 'book', label: 'Education' },
  { value: 'gamepad', label: 'Entertainment' },
  { value: 'shopping_bag', label: 'Shopping' },
  { value: 'receipt', label: 'Bills' },
  { value: 'landmark', label: 'Taxes' },
  { value: 'circle', label: 'Other' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'briefcase', label: 'Services' },
  { value: 'chart', label: 'Investments' },
  { value: 'gift', label: 'Gifts' },
  { value: 'refund', label: 'Refunds' },
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

export function categoryColorStyle(color) {
  return { backgroundColor: `var(--chart-${color}, var(--color-surface-tertiary))` }
}
