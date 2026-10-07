export const COLOR_VALUES = Object.freeze([
  'blue',
  'violet',
  'pink',
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'brown',
  'gray',
])

export const LEGACY_COLOR_ALIASES = Object.freeze({
  indigo: 'blue',
  purple: 'violet',
  amber: 'orange',
  lime: 'green',
  emerald: 'green',
  sky: 'cyan',
  teal: 'cyan',
  rose: 'pink',
  slate: 'gray',
})

export function presentationColor(value) {
  if (COLOR_VALUES.includes(value)) return value
  return Object.hasOwn(LEGACY_COLOR_ALIASES, value) ? LEGACY_COLOR_ALIASES[value] : null
}

export function colorOptions(t) {
  return COLOR_VALUES.map((value) => ({ value, label: t(`colors.${value}`) }))
}

export function colorLabel(value, t) {
  const presented = presentationColor(value)
  return presented ? t(`colors.${presented}`) : value
}

export function colorStyle(value) {
  const presented = presentationColor(value)
  return {
    backgroundColor: presented ? `var(--palette-${presented})` : 'var(--color-surface-tertiary)',
  }
}
