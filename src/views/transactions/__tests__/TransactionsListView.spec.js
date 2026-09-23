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
  totals: null,
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
  clearFeedback: vi.fn(),
  clearValidationErrors: vi.fn(),
}))
const transferStore = vi.hoisted(() => ({
  saving: false,
  error: null,
  validationErrors: {},
  notice: null,
  lastBalanceImpact: [],
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  select: vi.fn(),
  clearFeedback: vi.fn(),
  clearValidationErrors: vi.fn(),
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
const routerPush = vi.hoisted(() => vi.fn())
const dashboardSummary = vi.hoisted(() => vi.fn())
const historyList = vi.hoisted(() => vi.fn())

vi.mock('@/stores/transactions/transactionStore', () => ({ useTransactionStore: () => store }))
vi.mock('@/stores/transfers/transferStore', () => ({ useTransferStore: () => transferStore }))
vi.mock('@/stores/financial-accounts/financialAccountStore', () => ({
  useFinancialAccountStore: () => accounts,
}))
vi.mock('@/stores/categories/categoryStore', () => ({ useCategoryStore: () => categories }))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
}))
vi.mock('@/services/dashboardService', () => ({ getDashboardSummary: dashboardSummary }))
vi.mock('@/services/transactionService', () => ({ listFinancialHistory: historyList }))

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
        template:
          '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name="center" /><slot name="actions" /></header>',
      },
      ElDropdown: {
        name: 'ElDropdown',
        emits: ['command'],
        template: '<div data-test="transactions-dropdown"><slot /><slot name="dropdown" /></div>',
      },
      ElDropdownMenu: { template: '<menu><slot /></menu>' },
      ElDropdownItem: {
        props: ['command'],
        template: '<button type="button" :data-command="command"><slot /></button>',
      },
      TransactionFilterBar: {
        props: ['filters', 'accounts', 'categories', 'loading'],
        emits: ['apply', 'clear'],
        template:
          '<div><p v-if="filters.q" data-test="active-criteria">Busca: {{ filters.q }}</p><button data-test="apply-filter" @click="$emit(\'apply\', { q: \'almoço\', type: \'expense\' })">apply</button><button data-test="clear-filter" @click="$emit(\'clear\')">clear</button></div>',
      },
      TransactionFormDialog: {
        props: ['modelValue', 'initialType', 'transfer'],
        emits: ['submit', 'update:modelValue'],
        template:
          '<div v-if="modelValue" data-test="form-dialog"><span data-test="form-mode">{{ initialType }}</span><span data-test="form-transfer-editing">{{ transfer?.id ?? "new" }}</span><button data-test="close-unified-form" @click="$emit(\'update:modelValue\', false)">close</button><button data-test="submit-unified-form" @click="$emit(\'submit\', initialType === \'transfer\' ? { kind: \'transfer\', payload: { amount_centavos: 1 } } : { kind: \'transaction\', payload: { amount_centavos: 1 } })">submit</button></div>',
      },
      TransactionDetailDrawer: {
        props: ['modelValue', 'transaction'],
        emits: ['view-rule'],
        template:
          '<aside v-if="modelValue" data-test="detail-drawer">{{ transaction?.description }} — {{ transaction?.category?.name }} — {{ transaction?.status }}<button v-if="transaction?.recurrence_source" data-test="view-recurrence-rule" @click="$emit(\'view-rule\', transaction.recurrence_source.id)" /></aside>',
      },
      TransactionRemoveDialog: {
        props: ['visible', 'transaction', 'loading'],
        emits: ['update:visible', 'confirm'],
        template: '<div v-if="visible" data-test="remove-dialog"><slot /></div>',
      },
      TransferLifecycleConfirmDialog: {
        props: ['visible', 'transfer', 'action', 'loading'],
        emits: ['update:visible', 'confirm'],
        template:
          '<div v-if="visible" data-test="transfer-remove-dialog"><button data-test="confirm-transfer-remove" @click="$emit(\'confirm\')">confirm</button></div>',
      },
      TransactionRowActions: {
        props: ['transaction', 'saving'],
        emits: ['edit', 'update-status', 'remove'],
        template:
          '<div data-test="transaction-row-actions"><button data-test="row-action-edit" @click.stop="$emit(\'edit\', transaction)">edit</button><button data-test="row-action-status" @click.stop="$emit(\'update-status\', transaction, transaction.status === \'effective\' ? \'pending\' : \'effective\')">status</button><button data-test="row-action-remove" @click.stop="$emit(\'remove\', transaction)">remove</button></div>',
      },
      TransferRowActions: {
        props: ['transfer', 'saving'],
        emits: ['edit', 'update-status', 'remove'],
        template:
          '<div data-test="transfer-row-actions"><button data-test="transfer-action-edit" @click.stop="$emit(\'edit\', transfer)">edit</button><button data-test="transfer-action-status" @click.stop="$emit(\'update-status\', transfer, transfer.status === \'effective\' ? \'pending\' : \'effective\')">status</button><button data-test="transfer-action-remove" @click.stop="$emit(\'remove\', transfer)">remove</button></div>',
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
    store.totals = null
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
    transferStore.create.mockResolvedValue({ id: 1 })
    transferStore.update.mockResolvedValue({ id: 1 })
    transferStore.remove.mockResolvedValue({ id: 1 })
    transferStore.error = null
    transferStore.notice = null
    transferStore.lastBalanceImpact = []
    route.query = {}
    dashboardSummary.mockResolvedValue({
      realized_income: { amount_centavos: 500_000 },
      realized_expenses: { amount_centavos: 200_000 },
      financial_result: { amount_centavos: 300_000 },
    })
    historyList.mockResolvedValue({ items: [], meta: { total: 0 } })
  })

  it('loads the history with the route criteria and shows the matching count', async () => {
    route.query = { q: 'almoço', per_page: '25' }
    store.meta = { total: 3, current_page: 1, last_page: 2, per_page: 25 }
    store.hasMore = true
    store.filters = { q: 'almoço', view: 'active', per_page: 25 }
    store.items = [row(2, 'Almoço')]
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    expect(store.setFilters).toHaveBeenCalledWith(expect.objectContaining({
      q: 'almoço', per_page: 25, view: 'active', from: expect.stringMatching(/-01$/), to: expect.any(String),
    }))
    expect(accounts.fetchAccounts).toHaveBeenCalled()
    expect(categories.fetchCategories).toHaveBeenCalledWith('active')
    expect(wrapper.get('[data-test="transaction-count"]').text()).toBe('3 transações')
    expect(wrapper.get('[data-test="active-criteria"]').text()).toContain('Busca: almoço')
    expect(wrapper.get('.history-item').text()).toContain('Almoço')
  })

  it('clears stale feedback left by removed movements before showing active history', async () => {
    mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    expect(store.clearFeedback).toHaveBeenCalledOnce()
    expect(transferStore.clearFeedback).toHaveBeenCalledOnce()
  })

  it('keeps only transaction actions in the header dropdown', async () => {
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    const trigger = wrapper.get('[data-test="transactions-header-menu"]')
    expect(trigger.classes()).toContain('el-button--primary')
    expect(trigger.text()).toContain('Nova transação')
    expect(trigger.find('svg').exists()).toBe(true)
    expect(
      wrapper
        .findAll('[data-test="new-transaction"], [data-test="open-removed-transactions"]')
        .map((button) => button.attributes('data-test')),
    ).toEqual(['new-transaction', 'open-removed-transactions'])
    expect(wrapper.get('[data-test="new-transaction"]').text()).toContain('Nova transação')
    expect(wrapper.get('[data-test="open-removed-transactions"]').text()).toContain(
      'Transações removidas',
    )
    expect(wrapper.get('[data-test="open-removed-transactions"] svg').exists()).toBe(true)

    expect(wrapper.find('[data-test="transfers-header-menu"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="new-transfer-from-transactions"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="open-removed-transfers-from-transactions"]').exists()).toBe(
      false,
    )

    const [transactionDropdown] = wrapper.findAllComponents({ name: 'ElDropdown' })
    transactionDropdown.vm.$emit('command', 'new')
    await flushPromises()
    expect(wrapper.get('[data-test="form-dialog"]').exists()).toBe(true)

    transactionDropdown.vm.$emit('command', 'removed')
    expect(routerPush).toHaveBeenCalledWith({ name: 'transactions-removed' })
  })

  it('clears form validation errors when the new transaction dialog closes', async () => {
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()
    const [transactionDropdown] = wrapper.findAllComponents({ name: 'ElDropdown' })

    transactionDropdown.vm.$emit('command', 'new')
    await flushPromises()
    await wrapper.get('[data-test="close-unified-form"]').trigger('click')

    expect(store.clearValidationErrors).toHaveBeenCalledOnce()
    expect(transferStore.clearValidationErrors).toHaveBeenCalledOnce()
  })

  it('renders the newest-first order returned by the API and opens a detail view', async () => {
    store.items = [row(2, 'Hoje'), row(1, 'Ontem')]
    store.meta = { total: 2, current_page: 1, last_page: 1, per_page: 50 }
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    const rows = wrapper.findAll('.history-item').map((node) => node.text())
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('Hoje')
    expect(rows[1]).toContain('Ontem')

    await wrapper.findAll('.history-toggle')[0].trigger('click')
    await wrapper.findAll('[data-test="view-history-details"]')[0].trigger('click')
    await flushPromises()

    expect(store.select).toHaveBeenCalledWith(2)
    expect(wrapper.get('[data-test="detail-drawer"]').text()).toContain('Hoje')
    expect(wrapper.get('[data-test="detail-drawer"]').text()).toContain('Alimentação')
  })

  it('opens the source recurring transaction from a generated transaction', async () => {
    store.items = [
      row(61, 'Internet', {
        recurrence_source: { id: 7, scheduled_date: '2026-10-05' },
      }),
    ]
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    await wrapper.get('.history-toggle').trigger('click')
    await wrapper.get('[data-test="view-history-details"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="view-recurrence-rule"]').trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith({
      name: 'recurring-transactions',
      query: { highlight: 7 },
    })
    expect(wrapper.find('[data-test="detail-drawer"]').exists()).toBe(false)
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

    const text = wrapper.get('.history-item').text()
    expect(text).toContain('Conta encerrada (arquivada)')
    expect(text).toContain('Contas antigas (arquivada)')
  })

  it('shows pending transactions with a warning status tag', async () => {
    store.items = [row(1, 'Pagamento futuro', { status: 'pending' })]
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    expect(wrapper.get('.el-tag').classes()).toContain('el-tag--warning')
  })

  it('uses row actions without opening details and toggles status directly', async () => {
    store.items = [row(1, 'Almoço')]
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="row-action-status"]').trigger('click')

    expect(store.select).not.toHaveBeenCalled()
    expect(store.update).toHaveBeenCalledWith(1, { status: 'pending' })
  })

  it('edits, updates the status of, and removes transfer rows from mixed history', async () => {
    const transfer = {
      movement_kind: 'transfer',
      id: 9,
      amount_centavos: 250_000,
      movement_date: '2026-09-13',
      transfer_date: '2026-09-13',
      status: 'effective',
      source_financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
      destination_financial_account: { id: 2, name: 'Poupança', status: 'active' },
    }
    store.items = [transfer]
    transferStore.select.mockResolvedValue(transfer)
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="transfer-action-edit"]').trigger('click')
    await flushPromises()
    expect(transferStore.select).toHaveBeenCalledWith(9)
    expect(wrapper.get('[data-test="form-mode"]').text()).toBe('transfer')
    expect(wrapper.get('[data-test="form-transfer-editing"]').text()).toBe('9')

    await wrapper.get('[data-test="submit-unified-form"]').trigger('click')
    await flushPromises()
    expect(transferStore.update).toHaveBeenCalledWith(9, { amount_centavos: 1 })

    await wrapper.get('[data-test="transfer-action-status"]').trigger('click')
    await flushPromises()
    expect(transferStore.update).toHaveBeenLastCalledWith(9, { status: 'pending' })

    await wrapper.get('[data-test="transfer-action-remove"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="transfer-remove-dialog"]').exists()).toBe(true)
    await wrapper.get('[data-test="confirm-transfer-remove"]').trigger('click')
    await flushPromises()
    expect(transferStore.remove).toHaveBeenCalledWith(9)
    expect(store.fetch).toHaveBeenCalledTimes(3)
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

  it('surfaces transfer action errors, notices, and balance impacts', async () => {
    transferStore.error = { message: 'Transferência futura deve permanecer pendente.' }
    transferStore.notice = { code: 'effective_future_date', message: 'Permanece efetiva.' }
    transferStore.lastBalanceImpact = [
      { id: 2, name: 'Poupança', before: 1_000, after: 1_200, delta: 200 },
    ]
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    expect(wrapper.get('[data-test="transfer-error"]').text()).toContain('Transferência futura')
    expect(wrapper.get('[data-test="transfer-notice"]').text()).toContain('Permanece efetiva.')
    expect(wrapper.get('[data-test="transfer-balance-impact"]').text()).toContain('Poupança')
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

    expect(routerReplace).toHaveBeenLastCalledWith({ query: expect.objectContaining({ q: 'almoço', type: 'expense', from: expect.any(String), to: expect.any(String) }) })
    expect(store.setFilters).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'almoço', type: 'expense' }))

    await wrapper.get('[data-test="clear-filter"]').trigger('click')
    await flushPromises()

    expect(routerReplace).toHaveBeenLastCalledWith({ query: expect.objectContaining({ view: 'active', per_page: 50, from: expect.any(String), to: expect.any(String) }) })
    expect(store.setFilters).toHaveBeenLastCalledWith(
      expect.objectContaining({
        include: undefined,
        view: 'active',
        per_page: 50,
        q: undefined,
        type: undefined,
      }),
    )
  })

  it('renders a transfer labelled with both account sides, no category, and no income sign', async () => {
    store.items = [
      {
        movement_kind: 'transfer',
        id: 9,
        amount_centavos: 250_000,
        movement_date: '2026-09-13',
        status: 'effective',
        description: 'Reserva do mês',
        notes: null,
        source_financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
        destination_financial_account: { id: 2, name: 'Poupança', status: 'archived' },
        category: null,
      },
      row(8, 'Mercado'),
    ]
    store.meta = { total: 2, current_page: 1, last_page: 1, per_page: 50 }
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    const transferRow = wrapper.findAll('.history-item')[0].text()
    expect(transferRow).toContain('Transferência')
    expect(transferRow).toContain('Conta corrente → Poupança (arquivada)')
    expect(transferRow).not.toContain('+')
    expect(transferRow).not.toContain('−')
    expect(transferRow).not.toContain('Categoria')
    expect(wrapper.get('[data-test="transfer-history-amount"]').text()).toContain('2.500,00')
    expect(wrapper.findAll('.history-item')[1].text()).toContain('Mercado')
  })

  it('shows transaction amounts without repeating their income or expense type', async () => {
    store.items = [row(7, 'Salário', { type: 'income' }), row(8, 'Mercado')]
    store.meta = { total: 2, current_page: 1, last_page: 1, per_page: 50 }
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    const amounts = wrapper.findAll('[data-test="transaction-history-amount"]')

    expect(amounts).toHaveLength(2)
    expect(amounts[0].text()).toContain('+')
    expect(amounts[1].text()).toContain('−')
    expect(amounts.map((amount) => amount.text()).join(' ')).not.toMatch(/Receita|Despesa/)
  })

  it('uses a refresh icon with an accessible recurrence source label', async () => {
    store.items = [
      row(13, 'Internet', {
        recurrence_source: { id: 61, scheduled_date: '2026-10-05' },
      }),
    ]
    store.meta = { total: 1, current_page: 1, last_page: 1, per_page: 50 }
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    const indicator = wrapper.get('[data-test="transaction-recurrence-label"]')
    expect(indicator.find('svg').exists()).toBe(true)
    expect(indicator.attributes('aria-label')).toContain('#61')
    expect(indicator.text()).not.toContain('#61')
  })

  it('reports income and expense totals that a transfer never changes', async () => {
    store.filters = { view: 'active', per_page: 50, from: '2026-09-01', to: '2026-09-30' }
    route.query = { from: '2026-09-01', to: '2026-09-30' }
    const totals = {
      income_centavos: 500_000,
      expense_centavos: 200_000,
      financial_result_centavos: 300_000,
    }
    store.totals = totals
    store.items = [row(1, 'Salário', { type: 'income' })]
    store.meta = { total: 1, current_page: 1, last_page: 1, per_page: 50, totals }
    const before = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    expect(before.get('[data-test="history-total-income"]').text()).toContain('5.000,00')
    expect(before.get('[data-test="history-total-expense"]').text()).toContain('2.000,00')
    expect(before.get('[data-test="history-total-result"]').text()).toContain('3.000,00')
    expect(before.get('[data-test="history-total-excludes"]').text()).toContain('transferências')

    store.items = [
      {
        movement_kind: 'transfer',
        id: 12,
        amount_centavos: 90_000,
        movement_date: '2026-09-13',
        status: 'effective',
        description: null,
        notes: null,
        source_financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
        destination_financial_account: { id: 2, name: 'Poupança', status: 'active' },
        category: null,
      },
      row(1, 'Salário', { type: 'income' }),
    ]
    const after = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    expect(after.get('[data-test="history-total-income"]').text()).toBe(
      before.get('[data-test="history-total-income"]').text(),
    )
    expect(after.get('[data-test="history-total-expense"]').text()).toBe(
      before.get('[data-test="history-total-expense"]').text(),
    )
    expect(after.get('[data-test="history-total-result"]').text()).toBe(
      before.get('[data-test="history-total-result"]').text(),
    )
  })

  it('navigates across years with one date range for list and realized summary', async () => {
    route.query = { from: '2026-12-01', to: '2026-12-31' }
    store.filters = { view: 'active', per_page: 50, from: '2026-12-01', to: '2026-12-31' }
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    expect(wrapper.get('[data-test="transaction-month-label"]').text()).toContain('dezembro de 2026')
    await wrapper.get('[data-test="transaction-month-next"]').trigger('click')
    await flushPromises()

    expect(routerReplace).toHaveBeenLastCalledWith({ query: expect.objectContaining({ from: '2027-01-01', to: '2027-01-31', page: 1 }) })
    expect(store.setFilters).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2027-01-01', to: '2027-01-31', page: 1 }))
    expect(dashboardSummary).toHaveBeenLastCalledWith({ preset: 'custom', from: '2027-01-01', to: '2027-01-31' })
  })

  it('marks a custom range and suppresses summary under non-date filters', async () => {
    route.query = { from: '2026-09-10', to: '2026-09-20', q: 'almoço' }
    store.filters = { view: 'active', per_page: 50, ...route.query }
    const wrapper = mount(TransactionsListView, { global: stubs() })
    await flushPromises()

    expect(wrapper.get('[data-test="transaction-custom-period"]').text()).toContain('personalizado')
    expect(wrapper.find('[data-test="history-totals"]').exists()).toBe(false)
    expect(dashboardSummary).not.toHaveBeenCalled()
    await wrapper.get('[data-test="transaction-month-previous"]').trigger('click')
    await flushPromises()
    expect(routerReplace).toHaveBeenLastCalledWith({ query: expect.objectContaining({ from: '2026-08-01', to: '2026-08-31' }) })
  })
})
