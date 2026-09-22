import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { i18n } from '@/i18n'

const store = reactive({
  statement: null,
  card: null,
  loading: false,
  error: null,
  submitting: false,
  mutationError: null,
  fetchStatement: vi.fn(),
  submitPayment: vi.fn(),
  editPayment: vi.fn(),
  removeStatementPayment: vi.fn(),
  restoreStatementPayment: vi.fn(),
})

vi.mock('@/stores/credit-cards/creditCardStore', () => ({ useCreditCardStore: () => store }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { statement_id: '72' } }), useRouter: () => ({ push: vi.fn() }) }))

const { default: CreditCardStatementView } = await import('../CreditCardStatementView.vue')

const stubs = {
  PageHeader: { props: ['title', 'description'], template: '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name="actions" /></header>' },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
  ElTag: { template: '<span><slot /></span>' },
  ElIcon: { template: '<i><slot /></i>' },
  ElEmpty: { props: ['description'], template: '<p>{{ description }}</p>' },
  ElAlert: { props: ['title'], template: '<aside>{{ title }}</aside>' },
  ElSkeleton: true,
  CreditCardStatementPaymentDialog: true,
}

const money = (amount_centavos) => ({ amount_centavos, currency_code: 'BRL' })

function statement() {
  return {
    id: 72,
    card: { name: 'Nubank Platinum', institution_name: 'Nubank', last_four: '1234' },
    status: 'partially_paid',
    period_from: '2026-08-26',
    period_to: '2026-09-25',
    closing_date: '2026-09-25',
    due_date: '2026-10-05',
    original_amount: money(10_000),
    credit_adjustments: money(0),
    net_amount: money(10_000),
    paid_amount: money(3_334),
    outstanding_amount: money(6_666),
    installments: [{
      id: 301,
      description: 'Monthly groceries',
      purchase_date: '2026-09-05',
      sequence: 1,
      total_count: 3,
      amount: money(3_334),
    }],
    payments: [],
    credit_events: [],
  }
}

function factory() {
  return mount(CreditCardStatementView, {
    props: { statementId: 72 },
    global: { plugins: [i18n], stubs },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  store.statement = statement()
  store.card = { id: 41 }
  store.loading = false
  store.error = null
})

describe('CreditCardStatementView', () => {
  it('renders the localized statement dashboard from authoritative values', () => {
    const wrapper = factory()

    expect(store.fetchStatement).toHaveBeenCalledWith(72)
    expect(wrapper.get('h1').text()).toBe('Fatura de setembro de 2026')
    expect(wrapper.text()).toContain('Nubank •••• 1234')
    expect(wrapper.get('[data-test="credit-card-statement-status"]').text()).toContain('Parcialmente paga')
    expect(wrapper.text()).toContain('05/10/2026')
    expect(wrapper.get('[data-test="credit-card-statement-totals"]').text()).toContain('66,66')
    expect(wrapper.get('[data-test="credit-card-statement-outstanding"]').text()).toContain('66,66')
    expect(wrapper.get('[data-test="credit-card-statement-summary"]').text()).toContain('Saldo atual em aberto')
    expect(wrapper.get('[data-test="credit-card-statement-lines"]').text()).toContain('Data da compra')
    expect(wrapper.get('[data-test="credit-card-line-301"]').text()).toContain('Monthly groceries')
    expect(wrapper.get('[data-test="credit-card-line-301"]').text()).toContain('05/09/2026')
    expect(wrapper.get('[data-test="credit-card-line-301"]').text()).toContain('33,34')
    expect(wrapper.get('[data-test="credit-card-statement-payments"]').text()).toContain('Os pagamentos vinculados')
  })
})
