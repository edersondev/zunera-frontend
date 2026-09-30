function positiveId(value) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function notificationDestination(destination) {
  if (!destination || typeof destination !== 'object') return null
  const params = destination.params ?? {}

  switch (destination.kind) {
    case 'credit_card_statement': {
      const id = positiveId(params.statement_id)
      return id ? { name: 'credit-card-statement-detail', params: { statement_id: id } } : null
    }
    case 'transaction': {
      const id = positiveId(params.transaction_id)
      return id ? { name: 'transactions', query: { highlight: String(id) } } : null
    }
    case 'recurring_card_occurrence': {
      const ruleId = positiveId(params.rule_id)
      const occurrenceId = positiveId(params.occurrence_id)
      return ruleId && occurrenceId
        ? { name: 'recurring-transactions', query: { highlight: String(ruleId), occurrence_id: String(occurrenceId) } }
        : null
    }
    case 'budget_plan': {
      const year = Number(params.year)
      const month = Number(params.month)
      const planId = positiveId(params.plan_id)
      return Number.isInteger(year) && year >= 1900 && year <= 2100 && Number.isInteger(month) && month >= 1 && month <= 12 && planId
        ? { name: 'budgets', query: { year: String(year), month: String(month), plan_id: String(planId) } }
        : null
    }
    case 'goal': {
      const id = positiveId(params.goal_id)
      return id ? { name: 'goal-detail', params: { goal_id: id } } : null
    }
    default:
      return null
  }
}
