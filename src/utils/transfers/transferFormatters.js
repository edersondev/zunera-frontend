export function formatCentavos(centavos, locale = 'pt-BR') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(
    Number(centavos ?? 0) / 100,
  )
}

/**
 * Transfers are a neutral movement: the amount never carries an income or
 * expense sign, so history readers cannot mistake it for a report entry.
 */
export function formatTransferAmount(transfer, locale = 'pt-BR') {
  return formatCentavos(transfer?.amount_centavos, locale)
}

export function formatTransferDate(value, locale = 'pt-BR') {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
}

export function accountLabel(account, t) {
  if (!account) return ''

  const archived = account.status === 'archived' ? ` (${t('transfers.archived')})` : ''

  return `${account.name}${archived}`
}

export function formatTransferRoute(transfer, t) {
  return `${accountLabel(transfer?.source_financial_account, t)} → ${accountLabel(transfer?.destination_financial_account, t)}`
}

/** Non-color classification: the transfer is named in text, never by color alone. */
export function formatTransferLabel(transfer, t) {
  return `${t('transfers.transfer')}: ${formatTransferRoute(transfer, t)}`
}

export function formatMovementLabel(entry, t) {
  if (entry?.movement_kind === 'transfer') {
    return formatTransferLabel(entry, t)
  }

  return entry?.movement_kind === 'income' ? t('transactions.income') : t('transactions.expense')
}

export function formatTransferStatus(status, t) {
  return t(`transfers.${status}`)
}
