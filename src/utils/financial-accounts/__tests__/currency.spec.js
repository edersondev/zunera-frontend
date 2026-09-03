import { describe, expect, it } from 'vitest'
import { formatBRL, parseBRLToCentavos } from '../currency'

describe('financial account currency', () => {
  it('formats integer centavos as Brazilian real strings', () => {
    expect(formatBRL(0)).toBe('R$ 0,00')
    expect(formatBRL(125_050)).toBe('R$ 1.250,50')
    expect(formatBRL(-100_000)).toBe('-R$ 1.000,00')
  })

  it('parses Brazilian real strings into integer centavos', () => {
    expect(parseBRLToCentavos('R$ 1.250,50')).toBe(125_050)
    expect(parseBRLToCentavos('1.250,50')).toBe(125_050)
    expect(parseBRLToCentavos('-R$ 1.000,00')).toBe(-100_000)
    expect(parseBRLToCentavos('0,01')).toBe(1)
    expect(parseBRLToCentavos(1.5)).toBe(150)
  })

  it('rejects fractional centavo values and out-of-range formatting', () => {
    expect(() => formatBRL(1.5)).toThrow(RangeError)
    expect(() => formatBRL(1_000_000_000_000)).toThrow(RangeError)
  })
})
