import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  archiveCard as archiveCardRequest,
  createCard,
  createCreditEvent,
  createPayment,
  createPurchase,
  getCard,
  getDashboardCards,
  getStatement,
  isOverLimitConfirmation,
  listCards,
  listPurchases,
  listStatements,
  newIdempotencyKey,
  overLimitResultingCentavos,
  removePayment,
  restorePayment,
  updateCard,
  updatePurchase,
  updatePayment,
} from '@/services/creditCardService'

/**
 * Feature setup store for Credit Cards. Server snapshots stay shallow, every
 * money/status value comes from the API, and an explicit over-limit
 * confirmation is remembered so it can be resubmitted as a brand-new mutation
 * with a fresh idempotency key.
 */
export const useCreditCardStore = defineStore('credit-cards', () => {
  const cards = shallowRef([])
  const archivedCards = shallowRef([])
  const card = shallowRef(null)
  const statements = shallowRef([])
  const statement = shallowRef(null)
  const purchases = shallowRef([])
  const dashboard = shallowRef(null)

  const loading = shallowRef(false)
  const error = shallowRef(null)
  const submitting = shallowRef(false)
  const mutationError = shallowRef(null)
  const pendingOverLimit = shallowRef(null)

  const activeCards = computed(() => cards.value)
  const hasCards = computed(() => cards.value.length > 0)
  const currentStatement = computed(() => card.value?.current_statement ?? null)
  const upcomingStatements = computed(() => dashboard.value?.upcoming_statements ?? [])
  const history = computed(() => {
    const credit = card.value?.summary?.card_credit?.amount_centavos ?? 0
    const used = card.value?.summary?.used_credit?.amount_centavos ?? 0

    return { usedCentavos: used, cardCreditCentavos: credit }
  })

  async function fetchCards(view = 'active') {
    loading.value = true
    error.value = null

    try {
      const result = await listCards(view)
      if (view === 'archived') archivedCards.value = result
      else cards.value = result

      return result
    } catch (requestError) {
      error.value = requestError
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchCard(cardId) {
    loading.value = true
    error.value = null

    try {
      card.value = await getCard(cardId)
      return card.value
    } catch (requestError) {
      error.value = requestError
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveCard(payload, cardId = null) {
    return runMutation(async () => {
      const saved = cardId
        ? await updateCard(cardId, payload, newIdempotencyKey())
        : await createCard(payload, newIdempotencyKey())
      card.value = saved
      await refreshCardsQuietly()

      return saved
    })
  }

  async function archiveCard(cardId) {
    return runMutation(async () => {
      const archived = await archiveCardRequest(cardId, newIdempotencyKey())
      card.value = archived
      await refreshCardsQuietly()

      return archived
    })
  }

  async function fetchStatements(cardId, params = {}) {
    try {
      const result = await listStatements(cardId, params)
      statements.value = result.statements

      return result
    } catch (requestError) {
      error.value = requestError

      return { statements: [], meta: null }
    }
  }

  async function fetchStatement(statementId) {
    loading.value = true
    try {
      statement.value = await getStatement(statementId)

      return statement.value
    } catch (requestError) {
      error.value = requestError
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchPurchases(cardId, params = {}) {
    try {
      const result = await listPurchases(cardId, params)
      purchases.value = result.purchases

      return result
    } catch (requestError) {
      error.value = requestError

      return { purchases: [], meta: null }
    }
  }

  async function fetchDashboard() {
    try {
      dashboard.value = await getDashboardCards()

      return dashboard.value
    } catch (requestError) {
      error.value = requestError
      return null
    }
  }

  /**
   * Returns { ok, overLimit } instead of throwing a confirmation away: the
   * dialog shows the exact resulting available credit and, on user confirmation,
   * submitOverLimit() sends the same details as a new mutation with a fresh key.
   */
  async function submitPurchase(cardId, payload) {
    submitting.value = true
    mutationError.value = null
    pendingOverLimit.value = null

    try {
      const purchase = await createPurchase(cardId, payload, newIdempotencyKey())
      await refreshCardAfterMutation(cardId)

      return { ok: true, purchase, overLimit: false }
    } catch (requestError) {
      if (isOverLimitConfirmation(requestError)) {
        pendingOverLimit.value = {
          cardId,
          payload,
          resultingCentavos: overLimitResultingCentavos(requestError),
        }

        return { ok: false, purchase: null, overLimit: true, resultingCentavos: overLimitResultingCentavos(requestError) }
      }

      mutationError.value = requestError

      return { ok: false, purchase: null, overLimit: false }
    } finally {
      submitting.value = false
    }
  }

  async function submitOverLimit() {
    const pending = pendingOverLimit.value
    if (!pending) return { ok: false, purchase: null }

    submitting.value = true
    mutationError.value = null

    try {
      const purchase = await createPurchase(
        pending.cardId,
        {
          ...pending.payload,
          confirm_over_limit: true,
          expected_available_credit_centavos: pending.resultingCentavos + pending.payload.total_amount_centavos,
        },
        newIdempotencyKey(),
      )
      pendingOverLimit.value = null
      await refreshCardAfterMutation(pending.cardId)

      return { ok: true, purchase, overLimit: false }
    } catch (requestError) {
      mutationError.value = requestError

      return { ok: false, purchase: null }
    } finally {
      submitting.value = false
    }
  }

  function dismissOverLimit() {
    pendingOverLimit.value = null
  }

  async function submitPayment(statementId, payload) {
    return runMutation(async () => {
      const result = await createPayment(statementId, payload, newIdempotencyKey())
      statement.value = result.statement
      card.value = result.card

      return result
    })
  }

  async function editPayment(paymentId, payload) {
    return runMutation(async () => {
      const result = await updatePayment(paymentId, payload, newIdempotencyKey())
      statement.value = result.statement
      card.value = result.card

      return result
    })
  }

  async function removeStatementPayment(paymentId) {
    return runMutation(async () => {
      const result = await removePayment(paymentId, newIdempotencyKey())
      statement.value = result.statement
      card.value = result.card

      return result
    })
  }

  async function restoreStatementPayment(paymentId, payload = {}) {
    return runMutation(async () => {
      const result = await restorePayment(paymentId, payload, newIdempotencyKey())
      statement.value = result.statement
      card.value = result.card

      return result
    })
  }

  async function submitCreditEvent(purchaseId, payload) {
    return runMutation(async () => {
      const result = await createCreditEvent(purchaseId, payload, newIdempotencyKey())
      card.value = result.card

      return result
    })
  }

  /**
   * Direct correction is only offered while the purchase is still directly
   * editable; the server re-checks that every installment remains open.
   */
  async function submitPurchaseCorrection(purchaseId, payload) {
    return runMutation(async () => {
      const purchase = await updatePurchase(purchaseId, payload, newIdempotencyKey())
      card.value = await getCard(purchase.card.id)
      await refreshCardsQuietly()

      return purchase
    })
  }

  async function refreshCardAfterMutation(cardId) {
    card.value = await getCard(cardId)
    await refreshCardsQuietly()
  }

  async function refreshCardsQuietly() {
    try {
      cards.value = await listCards('active')
    } catch {
      // A failed refresh must not mask a successful mutation.
    }
  }

  async function runMutation(operation) {
    submitting.value = true
    mutationError.value = null

    try {
      return { ok: true, result: await operation() }
    } catch (requestError) {
      mutationError.value = requestError

      return { ok: false, result: null }
    } finally {
      submitting.value = false
    }
  }

  return {
    cards,
    archivedCards,
    card,
    statements,
    statement,
    purchases,
    dashboard,
    loading,
    error,
    submitting,
    mutationError,
    pendingOverLimit,
    activeCards,
    hasCards,
    currentStatement,
    upcomingStatements,
    history,
    fetchCards,
    fetchCard,
    saveCard,
    archiveCard,
    fetchStatements,
    fetchStatement,
    fetchPurchases,
    fetchDashboard,
    submitPurchase,
    submitOverLimit,
    dismissOverLimit,
    submitPayment,
    editPayment,
    removeStatementPayment,
    restoreStatementPayment,
    submitCreditEvent,
    submitPurchaseCorrection,
  }
})
