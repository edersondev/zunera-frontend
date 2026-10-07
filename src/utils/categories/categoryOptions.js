import { COLOR_VALUES, colorLabel, colorOptions, colorStyle } from '@/utils/colors/colorPalette'
import { ICON_COMPONENTS, ICON_CONTEXTS, iconLabel, iconOptions } from '@/utils/icons/iconRegistry'

export const CATEGORY_CLASSIFICATIONS = Object.freeze(['income', 'expense'])

export const CATEGORY_COLORS = COLOR_VALUES

export const CATEGORY_ICONS = ICON_CONTEXTS.categories

function localizedOptions(values, keyPrefix, t) {
  return values.map((value) => ({ value, label: t(`${keyPrefix}.${value}`) }))
}

export function categoryClassificationOptions(t) {
  return localizedOptions(CATEGORY_CLASSIFICATIONS, 'categories.classifications', t)
}

export function categoryColorOptions(t) {
  return colorOptions(t)
}

export function categoryIconOptions(t) {
  return iconOptions('categories', t)
}

export function categoryClassificationLabel(value, t) {
  return CATEGORY_CLASSIFICATIONS.includes(value) ? t(`categories.classifications.${value}`) : value
}

export function categoryColorLabel(value, t) {
  return colorLabel(value, t)
}

export function categoryIconLabel(value, t) {
  return iconLabel('categories', value, t)
}

export const CATEGORY_ICON_COMPONENTS = ICON_COMPONENTS

export function categoryColorStyle(color) {
  return colorStyle(color)
}
