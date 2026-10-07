export const COLOR_VALUES = Object.freeze([
  'teal',
  'blue',
  'indigo',
  'violet',
  'purple',
  'pink',
  'rose',
  'red',
  'orange',
  'amber',
  'lime',
  'green',
  'emerald',
  'cyan',
  'sky',
  'slate',
])

export function colorOptions(t) {
  return COLOR_VALUES.map((value) => ({ value, label: t(`colors.${value}`) }))
}

export function colorLabel(value, t) {
  return COLOR_VALUES.includes(value) ? t(`colors.${value}`) : value
}

export function colorStyle(value) {
  return {
    backgroundColor: COLOR_VALUES.includes(value)
      ? `var(--palette-${value})`
      : 'var(--color-surface-tertiary)',
  }
}
