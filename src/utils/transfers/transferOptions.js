export const TRANSFER_STATUSES = Object.freeze(['effective', 'pending'])

export const TRANSFER_MOVEMENT_KINDS = Object.freeze(['all', 'income', 'expense', 'transfer'])

export function transferStatusOptions(t) {
  return TRANSFER_STATUSES.map((value) => ({ value, label: t(`transfers.${value}`) }))
}

export function movementKindOptions(t) {
  return TRANSFER_MOVEMENT_KINDS.map((value) => ({ value, label: t(`transfers.movementKinds.${value}`) }))
}

/**
 * Archived accounts stay readable while the association is unchanged, but they
 * are never offered as a new transfer side.
 */
function retainArchived(choices, current) {
  if (current && !choices.some((choice) => choice.id === current.id)) {
    return [...choices, { ...current, archived: true }]
  }

  return choices
}

function activeChoices(accounts, excludedId) {
  return accounts
    .filter((account) => account.status === 'active' && account.id !== excludedId)
    .map((account) => ({ ...account, archived: false }))
}

export function sourceSideOptions(accounts, transfer) {
  return retainArchived(activeChoices(accounts), transfer?.source_financial_account)
}

export function destinationSideOptions(accounts, transfer, sourceId) {
  return retainArchived(
    activeChoices(accounts, sourceId),
    sourceId === transfer?.destination_financial_account?.id ? null : transfer?.destination_financial_account,
  )
}

export function sideLabel(option, t) {
  return option?.archived ? `${option.name} (${t('transfers.archived')})` : (option?.name ?? '')
}
