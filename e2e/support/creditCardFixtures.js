export function money(amountCentavos) {
  return { amount_centavos: amountCentavos, currency_code: 'BRL' }
}

export function creditCard(id, name, status = 'active', overrides = {}) {
  const card = {
    id,
    name,
    institution_name: 'Nubank',
    last_four: '1234',
    color: 'violet',
    icon: 'credit_card',
    status,
    closing_day: 10,
    due_day: 17,
    summary: {
      credit_limit: money(500_000),
      used_credit: money(0),
      card_credit: money(0),
      available_credit: money(500_000),
      is_over_limit: false,
    },
  }

  return {
    ...card,
    ...overrides,
    summary: { ...card.summary, ...overrides.summary },
    current_statement: {
      id: null,
      card: { ...card, ...overrides, current_statement: undefined, summary: undefined },
      period_from: '2026-09-11',
      period_to: '2026-10-10',
      closing_date: '2026-10-10',
      due_date: '2026-10-17',
      original_amount: money(0),
      credit_adjustments: money(0),
      net_amount: money(0),
      paid_amount: money(0),
      card_credit_applied: money(0),
      outstanding_amount: money(0),
      status: 'open',
      is_current: status === 'active',
    },
  }
}

export function apiHeaders() {
  return {
    'Access-Control-Allow-Origin': 'http://localhost:4173',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key, X-XSRF-TOKEN, X-Requested-With, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  }
}

export function sessionPayload() {
  const now = Date.now()

  return {
    data: {
      user: { id: 1, email: 'person@example.com' },
      session: {
        idle_expires_at: new Date(now + 15 * 60 * 1000).toISOString(),
        absolute_expires_at: new Date(now + 8 * 60 * 60 * 1000).toISOString(),
      },
    },
  }
}
