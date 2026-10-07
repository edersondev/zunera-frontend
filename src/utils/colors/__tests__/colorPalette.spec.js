import { describe, expect, it } from 'vitest'
import {
  COLOR_VALUES,
  LEGACY_COLOR_ALIASES,
  colorLabel,
  colorOptions,
  colorStyle,
  presentationColor,
} from '../colorPalette'

const labels = {
  blue: 'Azul',
  violet: 'Violeta',
  pink: 'Rosa',
  red: 'Vermelho',
  orange: 'Laranja',
  yellow: 'Amarelo',
  green: 'Verde',
  cyan: 'Ciano',
  brown: 'Marrom',
  gray: 'Cinza',
}
const translate = (key) => labels[key.slice('colors.'.length)]

describe('colorPalette', () => {
  it('offers exactly ten localized colors in the shared order', () => {
    expect(COLOR_VALUES).toEqual(Object.keys(labels))
    expect(colorOptions(translate)).toEqual(
      COLOR_VALUES.map((value) => ({ value, label: labels[value] })),
    )
  })

  it.each(Object.entries(LEGACY_COLOR_ALIASES))('presents legacy %s as %s', (legacy, color) => {
    expect(presentationColor(legacy)).toBe(color)
    expect(colorLabel(legacy, translate)).toBe(labels[color])
    expect(colorStyle(legacy).backgroundColor).toBe(`var(--palette-${color})`)
  })

  it('keeps unknown values visibly separate from palette choices', () => {
    expect(presentationColor('chartreuse')).toBeNull()
    expect(presentationColor('constructor')).toBeNull()
    expect(colorLabel('chartreuse', translate)).toBe('chartreuse')
    expect(colorStyle('chartreuse').backgroundColor).toBe('var(--color-surface-tertiary)')
  })
})
