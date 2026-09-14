export function formatTransactionAmount(transaction, locale = 'pt-BR') {
  const amount = new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(transaction.amount_centavos / 100)
  return transaction.type === 'income' ? `+ ${amount}` : `− ${amount}`
}
export function formatTransactionDate(value, locale = 'pt-BR') {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''
  const date = new Date(`${normalizedValue}T00:00:00`)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}
