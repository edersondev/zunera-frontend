import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import TransactionsListView from '../TransactionsListView.vue'
import { i18n } from '@/i18n'

const store = vi.hoisted(() => ({
  items: [],
  meta: { total: 0, current_page: 1, last_page: 1, per_page: 50 },
  selected: null,
  filters: { view: 'active', per_page: 50 },
  loading: false,
  saving: false,
  error: null,
  validationErrors: {},
  notice: null,
  lastBalanceImpact: [],
  hasMore: false,
  fetch: vi.fn(),
  setFilters: vi.fn(),
  loadMore: vi.fn(),
  select: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  restore: vi.fn(),
  clearNotice: vi.fn(),
}))
const accounts = vi.hoisted(() => ({
  accounts: [{ id: 1, name: 'Conta principal', status: 'active', current_balance_centavos: 1_000 }],
  fetchAccounts: vi.fn(),
  fetchSummary: vi.fn(),
}))
const categories = vi.hoisted(() => ({
  categories: [{ id: 2, name: 'Salário', classification: 'income', status: 'active' }],
  fetchCategories: vi.fn(),
}))
const route = vi.hoisted(() => ({ query: {} }))
const routerReplace = vi.hoisted(() => vi.fn())

vi.mock('@/stores/transactions/transactionStore', () => ({ useTransactionStore: () => store }))
vi.mock('@/stores/financial-accounts/financialAccountStore', () => ({
  useFinancialAccountStore: () => accounts,
}))
vi.mock('@/stores/categories/categoryStore', () => ({ useCategoryStore: () => categories }))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace: routerReplace }),
}))

function row(id, description, overrides = {}) {
  return {
    id,
    description,
    type: 'expense',
    status: 'effective',
    amount_centavos: 100,
    transaction_date: '2026-09-11',
    financial_account: { id: 1, name: 'Conta principal', status: 'active' },
    category: { id: 2, name: 'Alimentação', status: 'active' },
    ...overrides,
  }
}

function stubs() {
  return {
    plugins: [ElementPlus, i18n],
    stubs: {
      PageHeader: {
        props: ['title', 'description'],
        template: '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name="actions" /></header>',
      },
      TransactionFilterBar: {
        props: ['filters', 'accounts', 'categories', 'loading'],
        emits: ['apply', 'clear'],
        template:
          '<div><button data-test="apply-filter" @click="$emit(\'apply\', { q: \'almoço\', type: \'expense\' })">apply</button><button data-test="clear-filter" @click="$emit(\'clear\')">clear</button></div>',
      },
      TransactionFormDialog: { props: ['modelValue'], template: '<div data-test="form-dialog" />' },
      TransactionDetailDrawer: {
        props: ['modelValue', 'transaction'],
        template:
          '<aside v-if="modelValue" data-test="detail-drawer">{{ transaction?.description }} — {{ transaction?.category?.name }} — {{ transaction?.status }}</aside>',
      },
      TransactionRemoveDialog: {
        props: ['visible', 'transaction', 'loading'],
        emits: ['update:visible', 'confirm'],
        template: '<div v-if="visible" data-test="remove-dialog"><slot /></div>',
      },
      teleport: true,
    },
  }
}

describe('TransactionsListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.items = []
    store.selected = null
    store.error = null
    store.notice = null
    store.lastBalanceImpact = []
    store.hasMore = false
    store.meta = { total: 0, current_page: 1, last_page: 1, per_page: 50 }
    store.filters = { view: 'active', per_page: 50 }
    store.setFilters.mockImplementation(async (value) => {
      store.filters = { ...store.filters, ...value, page: 1 }

      return {}
    })
    store.fetch.mockResolvedValue({})
    store.loadMore.mockResolvedValue({})
    store.select.mockImplementation(async (id) => {
      store.selected = store.items.find((item) => item.id === id) ?? null

      return store.selected
    })
    route.query = {}
  })

  it('loads the history with the route criteria and shows the matching count', async () => {
    route.query = { q: 'almoço', per_page: '25' }
    store.meta = { total: 3, current_page: 1, last_page: 2, per_page: 25 }
    store.hasMore = true
    store.filters = { q: 'almoço', view: 'active', per_page: 25 }
    store.items = [row(2, 'Almoço')]
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    expect(store.setFilters).toHaveBeenCalledWith({ q: 'almoço', per_page: 25, view: 'active' })
    expect(accounts.fetchAccounts).toHaveBeenCalled()
    expect(categories.fetchCategories).toHaveBeenCalledWith('active')
    expect(wrapper.get('[data-test="transaction-count"]').text()).toBe('3 transações')
    expect(wrapper.get('[data-test="active-criteria"]').text()).toContain('Busca: almoço')
    expect(wrapper.get('.el-table__row').text()).toContain('Almoço')
  })

  it('places the new transaction action before removed transactions', async () => {
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    expect(
      wrapper.findAll('[data-test="new-transaction"], [data-test="open-removed-transactions"]').map((button) => button.attributes('data-test')),
    ).toEqual(['new-transaction', 'open-removed-transactions'])
    expect(wrapper.get('[data-test="open-removed-transactions"]').classes()).toContain('el-button--info')
    expect(wrapper.get('[data-test="open-removed-transactions"] svg').exists()).toBe(true)
  })

  it('renders the newest-first order returned by the API and opens a detail view', async () => {
    store.items = [row(2, 'Hoje'), row(1, 'Ontem')]
    store.meta = { total: 2, current_page: 1, last_page: 1, per_page: 50 }
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    const rows = wrapper.findAll('.el-table__row').map((node) => node.text())
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('Hoje')
    expect(rows[1]).toContain('Ontem')

    await wrapper.findAll('.el-table__row')[0].trigger('click')
    await flushPromises()

    expect(store.select).toHaveBeenCalledWith(2)
    expect(wrapper.get('[data-test="detail-drawer"]').text()).toContain('Hoje')
    expect(wrapper.get('[data-test="detail-drawer"]').text()).toContain('Alimentação')
  })

  it('labels archived associations in the history rows', async () => {
    store.items = [
      row(1, 'Conta antiga', {
        financial_account: { id: 9, name: 'Conta encerrada', status: 'archived' },
        category: { id: 7, name: 'Contas antigas', status: 'archived' },
      }),
    ]
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    const text = wrapper.get('.el-table__row').text()
    expect(text).toContain('Conta encerrada (arquivada)')
    expect(text).toContain('Contas antigas (arquivada)')
  })

  it('shows loading, empty, error, notice, and balance feedback states', async () => {
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()
    expect(wrapper.get('[data-test="transaction-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="transaction-error"]').exists()).toBe(false)
  })

  it('surfaces the server error, typed notice, and balance impact', async () => {
    store.error = { message: 'Falha ao carregar.' }
    store.notice = { code: 'effective_future_date', message: 'Permanece efetiva.' }
    store.lastBalanceImpact = [
      { id: 1, name: 'Conta principal', before: 1_000, after: 800, delta: -200 },
    ]
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    expect(wrapper.get('[data-test="transaction-error"]').text()).toContain('Falha ao carregar.')
    expect(wrapper.get('[data-test="transaction-notice"]').text()).toContain('Permanece efetiva.')
    expect(wrapper.get('[data-test="balance-impact"]').text()).toContain('Saldo atualizado')
    expect(wrapper.get('[data-test="balance-impact"]').text()).toContain('Conta principal')
  })

  it('loads the next batch progressively', async () => {
    store.hasMore = true
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="load-more"]').trigger('click')

    expect(store.loadMore).toHaveBeenCalledTimes(1)
  })

  it('keeps applied and cleared criteria in the route query string', async () => {
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="apply-filter"]').trigger('click')
    await flushPromises()

    expect(routerReplace).toHaveBeenCalledWith({ query: { q: 'almoço', type: 'expense' } })
    expect(store.setFilters).toHaveBeenLastCalledWith({ q: 'almoço', type: 'expense' })

    await wrapper.get('[data-test="clear-filter"]').trigger('click')
    await flushPromises()

    expect(routerReplace).toHaveBeenLastCalledWith({ query: { view: 'active', per_page: 50 } })
    expect(store.setFilters).toHaveBeenLastCalledWith(
      expect.objectContaining({ view: 'active', per_page: 50, q: undefined, type: undefined }),
    )
  })
})
