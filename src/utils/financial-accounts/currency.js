const MIN_CENTAVOS = -999_999_999_999
const MAX_CENTAVOS = 999_999_999_999

export function formatBRL(centavos) {
  const value = Number(centavos)
  if (!Number.isInteger(value) || value < MIN_CENTAVOS || value > MAX_CENTAVOS) {
    throw new RangeError('BRL values must be whole centavos within the supported range.')
  }

  const sign = value < 0 ? '-' : ''
  const absolute = Math.abs(value)
  const reais = Math.floor(absolute / 100)
  const centavosPart = String(absolute % 100).padStart(2, '0')

  return `${sign}R$ ${reais.toLocaleString('pt-BR')},${centavosPart}`
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

  let integer = 0
  let fraction = 0

  if (normalized.includes(',')) {
    const [whole, decimal] = normalized.split(',')
    integer = Number(whole.replace(/\./g, '') || '0')
    fraction = Number((decimal ?? '').padEnd(2, '0').slice(0, 2))
  } else if (normalized.includes('.')) {
    const parts = normalized.split('.')
    fraction = Number((parts.pop() ?? '').padEnd(2, '0').slice(0, 2))
    integer = Number(parts.join('') || '0')
  } else {
    integer = Number(normalized || '0')
  }

  const centavos = integer * 100 + fraction
  return negative ? -centavos : centavos
}
