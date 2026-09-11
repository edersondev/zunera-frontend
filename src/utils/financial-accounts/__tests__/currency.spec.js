import { afterEach, describe, expect, it } from 'vitest'
import { formatBRL, parseBRLToCentavos } from '../currency'
import { i18n } from '@/i18n'

afterEach(() => {
  i18n.global.locale.value = 'pt-BR'
})

describe('financial account currency', () => {
  it('formats integer centavos as Brazilian real strings', () => {
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    expect(formatBRL(0)).toBe(formatter.format(0))
    expect(formatBRL(125_050)).toBe(formatter.format(1250.5))
    expect(formatBRL(-100_000)).toBe(formatter.format(-1000))
  })

  it('formats currency with selected locale', () => {
    i18n.global.locale.value = 'en'

    expect(formatBRL(125_050)).toBe(
      new Intl.NumberFormat('en', { style: 'currency', currency: 'BRL' }).format(1250.5),
    )
  })

  it('parses Brazilian real strings into integer centavos', () => {
    expect(parseBRLToCentavos('R$ 1.250,50')).toBe(125_050)
    expect(parseBRLToCentavos('1.250,50')).toBe(125_050)
    expect(parseBRLToCentavos('-R$ 1.000,00')).toBe(-100_000)
    expect(parseBRLToCentavos('0,01')).toBe(1)
    expect(parseBRLToCentavos(1.5)).toBe(150)
  })

  it('parses English-formatted real strings into integer centavos', () => {
    expect(parseBRLToCentavos('R$1,250.50')).toBe(125_050)
    expect(parseBRLToCentavos('0.01')).toBe(1)
  })

  it('rejects fractional centavo values and out-of-range formatting', () => {
    expect(() => formatBRL(1.5)).toThrow(RangeError)
    expect(() => formatBRL(1_000_000_000_000)).toThrow(RangeError)
  })
})
