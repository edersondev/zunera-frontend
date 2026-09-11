import { i18n } from '@/i18n'

const MIN_CENTAVOS = -999_999_999_999
const MAX_CENTAVOS = 999_999_999_999

export function formatBRL(centavos) {
  const value = Number(centavos)
  if (!Number.isInteger(value) || value < MIN_CENTAVOS || value > MAX_CENTAVOS) {
    throw new RangeError('BRL values must be whole centavos within the supported range.')
  }

  return new Intl.NumberFormat(i18n.global.locale.value, {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value / 100)
}

export function parseBRLToCentavos(value) {
  if (typeof value === 'number') {
    return Math.round(value * 100)
  }

  const raw = String(value).trim()
  if (!raw) {
    return 0
  }

  const negative = /^-\s*/.test(raw)
  const normalized = raw
    .replace(/\s+/g, '')
    .replace(/R\$/gi, '')
    .replace(/[^\d.,-]/g, '')
    .replace(/-/g, '')

  const lastComma = normalized.lastIndexOf(',')
  const lastPeriod = normalized.lastIndexOf('.')
  const decimalIndex = Math.max(lastComma, lastPeriod)
  const whole = decimalIndex === -1 ? normalized : normalized.slice(0, decimalIndex)
  const decimal = decimalIndex === -1 ? '' : normalized.slice(decimalIndex + 1)
  const integer = Number(whole.replace(/[.,]/g, '') || '0')
  const fraction = Number(decimal.padEnd(2, '0').slice(0, 2))

  const centavos = integer * 100 + fraction
  return negative ? -centavos : centavos
}
