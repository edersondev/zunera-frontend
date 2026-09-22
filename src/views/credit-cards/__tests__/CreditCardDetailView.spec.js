import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { i18n } from '@/i18n'

const store = reactive({
  card: null,
  statements: [],
  purchases: [],
  loading: false,
  error: null,
  submitting: false,
  mutationError: null,
  pendingOverLimit: null,
  fetchCard: vi.fn(),
  fetchStatements: vi.fn(),
  fetchPurchases: vi.fn(),
  submitPurchase: vi.fn(),
  submitOverLimit: vi.fn(),
  dismissOverLimit: vi.fn(),
  submitPurchaseCorrection: vi.fn(),
  submitCreditEvent: vi.fn(),
})
const routerPush = vi.fn()

vi.mock('@/stores/credit-cards/creditCardStore', () => ({ useCreditCardStore: () => store }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { card_id: '7' } }),
  useRouter: () => ({ push: routerPush }),
}))

const { default: CreditCardDetailView } = await import('../CreditCardDetailView.vue')

const money = (amount_centavos) => ({ amount_centavos, currency_code: 'BRL' })

const stubs = {
  PageHeader: {
    props: ['title', 'description'],
    template: '<header><h1>{{ title }}</h1><slot name="actions" /></header>',
  },
  ElAlert: { props: ['title'], template: '<aside>{{ title }}</aside>' },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
  ElEmpty: true,
  ElSkeleton: true,
  ElTag: { template: '<span><slot /></span>' },
  CreditCardPurchaseForm: {
    props: ['visible'],
    emits: ['submit', 'update:visible', 'confirm-over-limit', 'dismiss-over-limit'],
    template:
      '<section data-test="purchase-dialog" :data-visible="visible"><button data-test="purchase-dialog-submit" @click="$emit(\'submit\', {})">Save</button></section>',
  },
  CreditCardCorrectionDialog: true,
  CreditCardCreditEventDialog: true,
}

function card() {
  return {
    id: 7,
    name: 'Nubank',
    summary: {
      credit_limit: money(500_000),
      used_credit: money(0),
      card_credit: money(0),
      available_credit: money(500_000),
    },
    current_statement: {
      id: 72,
      status: 'open',
      period_from: '2026-09-01',
      period_to: '2026-09-30',
      closing_date: '2026-09-30',
      due_date: '2026-10-07',
      outstanding_amount: money(0),
    },
  }
}

describe('CreditCardDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.card = card()
    store.statements = []
    store.purchases = []
    store.error = null
    store.submitPurchase.mockResolvedValue({ ok: true, purchase: { id: 11 } })
  })

  it('closes the purchase dialog only after the purchase saves successfully', async () => {
    const wrapper = mount(CreditCardDetailView, {
      props: { cardId: 7 },
      global: { plugins: [i18n], stubs },
    })
    await flushPromises()

    await wrapper.get('[data-test="credit-card-purchase-create"]').trigger('click')
    expect(wrapper.get('[data-test="purchase-dialog"]').attributes('data-visible')).toBe('true')

    await wrapper.get('[data-test="purchase-dialog-submit"]').trigger('click')
    await flushPromises()

    expect(store.submitPurchase).toHaveBeenCalledWith(7, {})
    expect(store.fetchStatements).toHaveBeenLastCalledWith(7)
    expect(store.fetchPurchases).toHaveBeenLastCalledWith(7)
    expect(wrapper.get('[data-test="purchase-dialog"]').attributes('data-visible')).toBe('false')
    expect(wrapper.text()).toContain('Compra registrada.')
  })

  it('keeps current-statement navigation on the existing statement-detail route', async () => {
    const wrapper = mount(CreditCardDetailView, {
      props: { cardId: 7 },
      global: { plugins: [i18n], stubs },
    })
    await flushPromises()

    await wrapper.get('[data-test="credit-card-current-statement-open"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      name: 'credit-card-statement-detail',
      params: { statement_id: 72 },
    })
  })
})
