import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
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
  fetchPurchase: vi.fn(),
  submitPurchaseCorrection: vi.fn(),
  submitCreditEvent: vi.fn(),
  dismissMutationError: vi.fn(),
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
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\', $event)"><slot /></button>' },
  ElTag: { template: '<span><slot /></span>' },
  ElIcon: { template: '<i><slot /></i>' },
  ElEmpty: { props: ['description'], template: '<p>{{ description }}</p>' },
  ElAlert: { props: ['title'], template: '<aside>{{ title }}</aside>' },
  ElSkeleton: true,
  CreditCardStatementPaymentDialog: true,
  CreditCardCorrectionDialog: { name: 'CreditCardCorrectionDialog', props: ['visible', 'purchase'], template: '<div v-if="visible" data-test="correction-stub">{{ purchase.description }}</div>' },
  CreditCardCreditEventDialog: { name: 'CreditCardCreditEventDialog', props: ['visible', 'purchase'], template: '<div v-if="visible" data-test="refund-stub">{{ purchase.description }}</div>' },
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
      purchase_id: 201,
      description: 'Monthly groceries',
      purchase_date: '2026-09-05',
      sequence: 1,
      total_count: 3,
      amount: money(3_334),
      credit_adjustment: money(0),
      recognized_amount: money(3_334),
      purchase_total_amount: money(10_000),
      recognition_status: 'pending',
      is_directly_editable: true,
      category: { id: 18, name: 'Groceries', icon: 'shopping_bag', color: 'teal' },
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
  store.fetchPurchase.mockResolvedValue({ id: 201, description: 'Monthly groceries', is_directly_editable: true })
  store.submitPurchaseCorrection.mockResolvedValue({ ok: true })
  store.submitCreditEvent.mockResolvedValue({ ok: true })
})

describe('CreditCardStatementView', () => {
  it('renders the localized statement dashboard from authoritative values', async () => {
    const wrapper = factory()

    expect(store.fetchStatement).toHaveBeenCalledWith(72)
    expect(wrapper.get('h1').text()).toBe('Fatura de setembro de 2026')
    expect(wrapper.text()).toContain('Nubank •••• 1234')
    expect(wrapper.get('[data-test="credit-card-statement-status"]').text()).toContain('Parcialmente paga')
    expect(wrapper.text()).toContain('05/10/2026')
    expect(wrapper.get('[data-test="credit-card-statement-totals"]').text()).toContain('66,66')
    expect(wrapper.get('[data-test="credit-card-statement-outstanding"]').text()).toContain('66,66')
    expect(wrapper.get('[data-test="credit-card-statement-summary"]').text()).toContain('Saldo atual em aberto')
    expect(wrapper.get('[data-test="credit-card-line-301"]').text()).toContain('Monthly groceries')
    expect(wrapper.get('[data-test="credit-card-line-301"]').text()).toContain('05/09/2026')
    expect(wrapper.get('[data-test="credit-card-line-301"]').text()).toContain('33,34')
    await wrapper.get('[data-test="credit-card-line-toggle-301"]').trigger('click')
    expect(wrapper.get('[data-test="credit-card-line-details-301"]').text()).toContain('Data da compra')
    expect(wrapper.get('[data-test="credit-card-statement-payments"]').text()).toContain('Os pagamentos vinculados')
  })

  it('opens existing purchase dialogs and refreshes statement after actions', async () => {
    const wrapper = factory()
    await wrapper.get('[data-test="credit-card-line-toggle-301"]').trigger('click')
    await wrapper.get('[data-test="credit-card-line-correct-301"]').trigger('click')
    await flushPromises()

    expect(store.fetchPurchase).toHaveBeenCalledWith(201)
    expect(wrapper.get('[data-test="correction-stub"]').text()).toContain('Monthly groceries')
    wrapper.findComponent({ name: 'CreditCardCorrectionDialog' }).vm.$emit('submit', { description: 'Corrected' })
    await flushPromises()
    expect(store.submitPurchaseCorrection).toHaveBeenCalledWith(201, { description: 'Corrected' })
    expect(store.fetchStatement).toHaveBeenLastCalledWith(72)

    await wrapper.get('[data-test="credit-card-line-refund-301"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="refund-stub"]').text()).toContain('Monthly groceries')
    wrapper.findComponent({ name: 'CreditCardCreditEventDialog' }).vm.$emit('submit', { amount_centavos: 100 })
    await flushPromises()
    expect(store.submitCreditEvent).toHaveBeenCalledWith(201, { amount_centavos: 100 })
    expect(store.fetchStatement).toHaveBeenLastCalledWith(72)
  })
})
