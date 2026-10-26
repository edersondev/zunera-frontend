import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  archiveCard as archiveCardRequest,
  createCard,
  createCreditEvent,
  createPayment,
  createPurchase,
  deletePurchase,
  getCard,
  getStatementOptions,
  getPurchase,
  getDashboardCards,
  getStatement,
  isOverLimitConfirmation,
  listCards,
  listPurchases,
  listPurchaseMoves,
  listStatements,
  movePurchase,
  newIdempotencyKey,
  overLimitResultingCentavos,
  previewPurchaseMove,
  removePayment,
  restoreCard as restoreCardRequest,
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
  const purchaseMeta = shallowRef(null)
  const purchaseLoading = shallowRef(false)
  const purchaseLoadingMore = shallowRef(false)
  const purchaseLoadError = shallowRef(null)
  const purchaseListVersion = shallowRef(0)
  let purchaseRequestVersion = 0
  let purchaseCardId = null
  let cardRequestVersion = 0
  let statementsRequestVersion = 0
  const dashboard = shallowRef(null)
  const statementOptions = shallowRef(null)
  const optionsLoading = shallowRef(false)
  const optionsError = shallowRef(null)
  const movePreview = shallowRef(null)
  const moveHistory = shallowRef([])
  const previewLoading = shallowRef(false)
  const previewError = shallowRef(null)
  let optionsVersion = 0
  let historyVersion = 0
  let previewVersion = 0

  const loading = shallowRef(false)
  const error = shallowRef(null)
  const submitting = shallowRef(false)
  const mutationError = shallowRef(null)
  const pendingOverLimit = shallowRef(null)

  const activeCards = computed(() => cards.value)
  const hasCards = computed(() => cards.value.length > 0)
  const hasMorePurchases = computed(() =>
    (purchaseMeta.value?.current_page ?? 1) < (purchaseMeta.value?.last_page ?? 1),
  )
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
    const version = ++cardRequestVersion
    loading.value = true
    error.value = null

    try {
      const result = await getCard(cardId)
      if (version === cardRequestVersion) card.value = result
      return result
    } catch (requestError) {
      if (version === cardRequestVersion) error.value = requestError
      return null
    } finally {
      if (version === cardRequestVersion) loading.value = false
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

  async function restoreCard(cardId) {
    return runMutation(async () => {
      const restored = await restoreCardRequest(cardId, newIdempotencyKey())
      card.value = restored
      archivedCards.value = archivedCards.value.filter((archivedCard) => archivedCard.id !== cardId)
      await refreshCardsQuietly()

      return restored
    })
  }

  async function fetchStatements(cardId, params = {}) {
    const version = ++statementsRequestVersion
    try {
      const result = await listStatements(cardId, params)
      if (version === statementsRequestVersion) statements.value = result.statements

      return result
    } catch (requestError) {
      if (version === statementsRequestVersion) error.value = requestError

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
    const version = ++purchaseRequestVersion
    purchaseCardId = cardId
    purchases.value = []
    purchaseMeta.value = null
    purchaseLoadError.value = null
    purchaseLoading.value = true
    purchaseLoadingMore.value = false
    purchaseListVersion.value++

    try {
      const result = await listPurchases(cardId, params)
      if (version === purchaseRequestVersion) {
        purchases.value = result.purchases
        purchaseMeta.value = result.meta
      }

      return result
    } catch (requestError) {
      if (version === purchaseRequestVersion) purchaseLoadError.value = requestError

      return { purchases: [], meta: null }
    } finally {
      if (version === purchaseRequestVersion) purchaseLoading.value = false
    }
  }

  async function loadMorePurchases(cardId, retry = false) {
    if (cardId !== purchaseCardId || !hasMorePurchases.value || purchaseLoading.value || purchaseLoadingMore.value || (purchaseLoadError.value && !retry)) return null

    const version = purchaseRequestVersion
    const page = purchaseMeta.value.current_page + 1
    purchaseLoadError.value = null
    purchaseLoadingMore.value = true

    try {
      const result = await listPurchases(cardId, { page })
      if (version === purchaseRequestVersion) {
        const knownIds = new Set(purchases.value.map((purchase) => purchase.id))
        purchases.value = [...purchases.value, ...result.purchases.filter((purchase) => !knownIds.has(purchase.id))]
        purchaseMeta.value = result.meta
      }
      return result
    } catch (requestError) {
      if (version === purchaseRequestVersion) purchaseLoadError.value = requestError
      return null
    } finally {
      if (version === purchaseRequestVersion) purchaseLoadingMore.value = false
    }
  }

  function retryPurchases(cardId) {
    return purchaseMeta.value ? loadMorePurchases(cardId, true) : fetchPurchases(cardId)
  }

  async function fetchPurchase(purchaseId) {
    error.value = null

    try {
      return await getPurchase(purchaseId)
    } catch (requestError) {
      error.value = requestError
      return null
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

  async function fetchStatementOptions(cardId, params) {
    const version = ++optionsVersion
    optionsLoading.value = true
    optionsError.value = null
    try {
      const result = await getStatementOptions(cardId, params)
      if (version === optionsVersion) {
        const previous = params.from_month ? statementOptions.value?.options ?? [] : []
        statementOptions.value = {
          ...result,
          options: [...new Map([...previous, ...result.options].map((option) => [option.closing_date, option])).values()],
        }
      }
      return result
    } catch (requestError) {
      if (version === optionsVersion) optionsError.value = requestError
      return null
    } finally {
      if (version === optionsVersion) optionsLoading.value = false
    }
  }

  function clearStatementOptions() {
    optionsVersion++
    statementOptions.value = null
    optionsError.value = null
    optionsLoading.value = false
  }

  async function fetchMoveHistory(purchaseId) {
    const version = ++historyVersion
    moveHistory.value = []
    try {
      const result = await listPurchaseMoves(purchaseId)
      if (version === historyVersion) moveHistory.value = result
      return result
    } catch (requestError) {
      if (version === historyVersion) error.value = requestError
      return []
    }
  }

  function clearMoveHistory() {
    historyVersion++
    moveHistory.value = []
  }

  async function previewMove(purchaseId, payload) {
    const version = ++previewVersion
    movePreview.value = null
    previewError.value = null
    mutationError.value = null
    previewLoading.value = true
    try {
      const result = await previewPurchaseMove(purchaseId, payload)
      if (version === previewVersion) movePreview.value = result
      return version === previewVersion ? result : null
    } catch (requestError) {
      if (version === previewVersion) previewError.value = requestError
      return null
    } finally {
      if (version === previewVersion) previewLoading.value = false
    }
  }

  function clearMovePreview() {
    previewVersion++
    movePreview.value = null
    previewError.value = null
    previewLoading.value = false
  }

  async function submitMove(purchaseId, payload, cardId, statementId = null, idempotencyKey = newIdempotencyKey()) {
    const outcome = await runMutation(async () => {
      const result = await movePurchase(purchaseId, payload, idempotencyKey)
      clearMovePreview()
      await refreshCardActivity(cardId, statementId)
      return result
    })
    if (!outcome.ok && mutationError.value?.code === 'STALE_MOVE_PREVIEW') clearMovePreview()
    return outcome
  }

  async function submitDeletePurchase(purchaseId, cardId, statementId = null, idempotencyKey = newIdempotencyKey()) {
    return runMutation(async () => {
      const result = await deletePurchase(purchaseId, idempotencyKey)
      await refreshCardActivity(cardId, statementId)
      return result
    })
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

  function dismissMutationError() {
    mutationError.value = null
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
    await refreshCardActivity(cardId)
  }

  async function refreshCardActivity(cardId, statementId = null) {
    if (!cardId) return
    const refreshes = [
      getCard(cardId).then((result) => { card.value = result }),
      listCards('active').then((result) => { cards.value = result }),
      fetchPurchases(cardId),
      listStatements(cardId).then((result) => { statements.value = result.statements }),
      getDashboardCards().then((result) => { dashboard.value = result }),
    ]
    if (statementId) refreshes.push(getStatement(statementId).then((result) => { statement.value = result }))
    const outcomes = await Promise.allSettled(refreshes)
    const failure = outcomes.find((outcome) => outcome.status === 'rejected')
    if (failure) error.value = failure.reason
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
    purchaseMeta,
    purchaseLoading,
    purchaseLoadingMore,
    purchaseLoadError,
    purchaseListVersion,
    hasMorePurchases,
    dashboard,
    statementOptions,
    optionsLoading,
    optionsError,
    movePreview,
    moveHistory,
    previewLoading,
    previewError,
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
    restoreCard,
    fetchStatements,
    fetchStatement,
    fetchPurchases,
    loadMorePurchases,
    retryPurchases,
    fetchPurchase,
    fetchDashboard,
    fetchStatementOptions,
    clearStatementOptions,
    fetchMoveHistory,
    clearMoveHistory,
    previewMove,
    clearMovePreview,
    submitMove,
    submitDeletePurchase,
    refreshCardActivity,
    submitPurchase,
    submitOverLimit,
    dismissOverLimit,
    dismissMutationError,
    submitPayment,
    editPayment,
    removeStatementPayment,
    restoreStatementPayment,
    submitCreditEvent,
    submitPurchaseCorrection,
  }
})
