export function formatTransactionAmount(transaction, locale = 'pt-BR') {
  const amount = new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(transaction.amount_centavos / 100)
  return transaction.type === 'income' ? `+ ${amount}` : `− ${amount}`
}
export function formatTransactionDate(value, locale = 'pt-BR') {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
}
