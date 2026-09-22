const DEFAULT_LOCALE = 'pt-BR'
const BUSINESS_TIME_ZONE = 'America/Sao_Paulo'

/** Calendar month of the given instant in the business time zone. */
export function businessMonth(date = new Date()) {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  })
    .formatToParts(date)
    .reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {})

  return { year: Number(values.year), month: Number(values.month) }
}

/** Localized month label that never shifts the day across time zones. */
export function formatMonth(year, month, locale = DEFAULT_LOCALE) {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1))

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** Moves a { year, month } pair by whole months, crossing year boundaries. */
export function shiftMonth({ year, month }, offset) {
  const cursor = new Date(Date.UTC(Number(year), Number(month) - 1 + offset, 1))

  return { year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1 }
}

function pad(value) {
  return String(value).padStart(2, '0')
}

/** Inclusive first and last calendar day of the month as `YYYY-MM-DD` strings. */
export function monthBounds({ year, month }) {
  const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate()

  return {
    from: `${String(year).padStart(4, '0')}-${pad(month)}-01`,
    to: `${String(year).padStart(4, '0')}-${pad(month)}-${pad(lastDay)}`,
  }
}

/** Reads the calendar month out of a `YYYY-MM-DD` date, or null when unusable. */
export function monthFromDate(value) {
  const match = /^(\d{4})-(\d{2})/.exec(String(value ?? ''))

  if (!match) return null

  const month = Number(match[2])

  if (month < 1 || month > 12) return null

  return { year: Number(match[1]), month }
}
