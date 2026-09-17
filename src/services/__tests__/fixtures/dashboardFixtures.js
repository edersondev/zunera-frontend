const ACCOUNT = { id: 7, name: 'Conta corrente', type: 'checking', status: 'active' }
const EXPENSE_CATEGORY = {
  id: 3,
  name: 'Mercado',
  classification: 'expense',
  status: 'active',
}
const INCOME_CATEGORY = {
  id: 4,
  name: 'Salário',
  classification: 'income',
  status: 'active',
}

function money(amountCentavos) {
  return { amount_centavos: amountCentavos, currency_code: 'BRL' }
}

export function dashboardSummaryFixture(overrides = {}) {
  return {
    period: { preset: 'current_month', from: '2026-09-01', to: '2026-09-17' },
    current_total_balance: money(500_000),
    realized_income: money(320_000),
    realized_expenses: money(120_000),
    financial_result: money(200_000),
    ...overrides,
  }
}

export function dashboardAccountsFixture(overrides = {}) {
  return {
    current_total_balance: money(500_000),
    accounts: [
      {
        account: ACCOUNT,
        current_balance: money(500_000),
        allocation_percent: 100,
      },
    ],
    ...overrides,
  }
}

export function dashboardDistributionFixture(overrides = {}) {
  return {
    period: { preset: 'current_month', from: '2026-09-01', to: '2026-09-17' },
    total_expenses: money(120_000),
    categories: [
      {
        category: EXPENSE_CATEGORY,
        total: money(90_000),
        share_percent: 75,
        rank: 1,
      },
      {
        category: { ...EXPENSE_CATEGORY, id: 9, name: 'Assinaturas', status: 'archived' },
        total: money(30_000),
        share_percent: 25,
        rank: 2,
      },
    ],
    ...overrides,
  }
}

export function dashboardEvolutionFixture(overrides = {}) {
  return {
    period: { preset: 'custom', from: '2026-09-01', to: '2026-09-03' },
    interval: 'daily',
    intervals: [
      {
        from: '2026-09-01',
        to: '2026-09-01',
        label: '01/09',
        is_partial: false,
        income: money(320_000),
        expenses: money(0),
        result: money(320_000),
      },
      {
        from: '2026-09-02',
        to: '2026-09-03',
        label: '02/09',
        is_partial: true,
        income: money(0),
        expenses: money(120_000),
        result: money(-120_000),
      },
    ],
    ...overrides,
  }
}

export function dashboardRecentActivityFixture() {
  return [
    {
      movement_kind: 'expense',
      id: 21,
      status: 'effective',
      movement_date: '2026-09-12',
      amount: money(45_000),
      description: 'Mercado',
      account: ACCOUNT,
      category: EXPENSE_CATEGORY,
      recurrence_source: null,
    },
    {
      movement_kind: 'transfer',
      id: 22,
      status: 'pending',
      movement_date: '2026-09-11',
      amount: money(20_000),
      description: 'Reserva',
      source_account: ACCOUNT,
      destination_account: { ...ACCOUNT, id: 8, name: 'Poupança' },
      category: null,
      recurrence_source: null,
    },
    {
      movement_kind: 'income',
      id: 23,
      status: 'effective',
      movement_date: '2026-09-10',
      amount: money(320_000),
      description: 'Salário',
      account: ACCOUNT,
      category: INCOME_CATEGORY,
      recurrence_source: { id: 5, scheduled_date: '2026-09-10' },
    },
  ]
}

export function dashboardUpcomingActivityFixture() {
  return {
    meta: { from: '2026-09-18', to: '2026-10-17' },
    items: [
      {
        source_kind: 'pending_transaction',
        expected_date: '2026-09-25',
        type: 'expense',
        amount: money(21_500),
        account: ACCOUNT,
        category: EXPENSE_CATEGORY,
        description: 'Condomínio',
        state: 'expected',
      },
      {
        source_kind: 'recurring_occurrence',
        expected_date: '2026-10-05',
        type: 'income',
        amount: money(250_000),
        account: ACCOUNT,
        category: INCOME_CATEGORY,
        description: 'Aluguel',
        state: 'expected',
      },
    ],
  }
}
