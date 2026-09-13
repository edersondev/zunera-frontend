import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { i18n } from '@/i18n'
import TransfersListView from '../TransfersListView.vue'

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
  accounts: [{ id: 1, name: 'Conta corrente', status: 'active', current_balance_centavos: 500_000 }],
  fetchAccounts: vi.fn(),
  fetchSummary: vi.fn(),
}))
const route = vi.hoisted(() => ({ query: {} }))
const routerReplace = vi.hoisted(() => vi.fn())
const routerPush = vi.hoisted(() => vi.fn())

vi.mock('@/stores/transfers/transferStore', () => ({ useTransferStore: () => store }))
vi.mock('@/stores/financial-accounts/financialAccountStore', () => ({
  useFinancialAccountStore: () => accounts,
}))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
}))

function row(id, overrides = {}) {
  return {
    id,
    status: 'effective',
    amount_centavos: 100_000,
    transfer_date: '2026-09-13',
    description: null,
    notes: null,
    source_financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
    destination_financial_account: { id: 2, name: 'Poupança', status: 'archived' },
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
      TransferFilterBar: {
        props: ['filters', 'accounts', 'loading'],
        emits: ['apply', 'clear'],
        template:
          '<div><button data-test="apply-filter" @click="$emit(\'apply\', { q: \'reserva\', status: \'pending\' })">apply</button><button data-test="clear-filter" @click="$emit(\'clear\')">clear</button></div>',
      },
      TransferFormDialog: {
        props: ['modelValue', 'transfer'],
        emits: ['submit'],
        template:
          '<div v-if="modelValue" data-test="transfer-form-dialog"><span data-test="form-editing">{{ transfer?.id ?? "new" }}</span><button data-test="submit-form" @click="$emit(\'submit\', { amount_centavos: 1 })">submit</button></div>',
      },
      TransferDetailDrawer: {
        props: ['modelValue', 'transfer'],
        emits: ['edit', 'remove'],
        template:
          '<aside v-if="modelValue" data-test="transfer-detail-drawer"><span>{{ transfer?.id }}</span><button data-test="drawer-edit" @click="$emit(\'edit\', transfer)">edit</button><button data-test="drawer-remove" @click="$emit(\'remove\', transfer)">remove</button></aside>',
      },
      TransferLifecycleConfirmDialog: {
        props: ['visible', 'transfer', 'action', 'loading'],
        emits: ['confirm'],
        template:
          '<div v-if="visible" data-test="transfer-confirm-dialog"><span data-test="confirm-action">{{ action }}</span><span data-test="confirm-transfer">{{ transfer?.id }}</span><button data-test="confirm-lifecycle-submit" @click="$emit(\'confirm\')">confirm</button></div>',
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

describe('TransfersListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.items = []
    store.selected = null
    store.error = null
    store.notice = null
    store.lastBalanceImpact = []
    store.hasMore = false
    store.saving = false
    store.meta = { total: 0, current_page: 1, last_page: 1, per_page: 50 }
    store.filters = { view: 'active', per_page: 50 }
    store.setFilters.mockImplementation(async (value) => {
      store.filters = { ...store.filters, ...value, page: 1 }

      return {}
    })
    store.create.mockResolvedValue({ id: 1 })
    store.update.mockResolvedValue({ id: 1 })
    store.remove.mockResolvedValue({ id: 1 })
    store.select.mockImplementation(async (id) => {
      store.selected = store.items.find((item) => item.id === id) ?? null

      return store.selected
    })
    route.query = {}
  })

  it('loads the history with the route criteria and shows the matching count', async () => {
    route.query = { status: 'pending', per_page: '25' }
    store.meta = { total: 3, current_page: 1, last_page: 2, per_page: 25 }
    store.hasMore = true
    store.filters = { status: 'pending', view: 'active', per_page: 25 }
    store.items = [row(2)]
    const wrapper = mount(TransfersListView, { global: stubs() })
    await flushPromises()

    expect(store.setFilters).toHaveBeenCalledWith({ status: 'pending', per_page: 25, view: 'active' })
    expect(accounts.fetchAccounts).toHaveBeenCalled()
    expect(wrapper.get('[data-test="transfer-count"]').text()).toBe('3 transferências')
    expect(wrapper.get('[data-test="active-criteria"]').text()).toContain('Status: pending')
    expect(wrapper.get('[data-test="transfer-row-route"]').text()).toContain('Conta corrente → Poupança (arquivada)')
  })

  it('classifies transfers in text, never by color or income sign, and marks archived sides', async () => {
    store.items = [row(1)]
    const wrapper = mount(TransfersListView, { global: stubs() })
    await flushPromises()

    const rowText = wrapper.get('.el-table__row').text()
    expect(rowText).toContain('Transferência')
    expect(rowText).toContain('Conta corrente → Poupança (arquivada)')
    expect(wrapper.get('[data-test="transfer-row-amount"]').text()).not.toContain('+')
    expect(wrapper.get('[data-test="transfer-row-amount"]').text()).not.toContain('−')
    expect(wrapper.get('.el-tag').classes()).not.toContain('el-tag--warning')
  })

  it('shows pending transfers with a warning tag and opens details on row click', async () => {
    store.items = [row(4, { status: 'pending' })]
    const wrapper = mount(TransfersListView, { global: stubs() })
    await flushPromises()

    expect(wrapper.get('.el-tag').classes()).toContain('el-tag--warning')

    await wrapper.get('.el-table__row').trigger('click')
    await flushPromises()

    expect(store.select).toHaveBeenCalledWith(4)
    expect(wrapper.get('[data-test="transfer-detail-drawer"]').text()).toContain('4')
  })

  it('keeps the new transfer action before removed transfers', async () => {
    const wrapper = mount(TransfersListView, { global: stubs() })
    await flushPromises()

    expect(
      wrapper
        .findAll('[data-test="new-transfer"], [data-test="open-removed-transfers"]')
        .map((button) => button.attributes('data-test')),
    ).toEqual(['new-transfer', 'open-removed-transfers'])

    await wrapper.get('[data-test="open-removed-transfers"]').trigger('click')
    expect(routerPush).toHaveBeenCalledWith({ name: 'transfers-removed' })
  })

  it('edits through the form dialog, toggles status directly, and removes through confirmation', async () => {
    store.items = [row(6)]
    const wrapper = mount(TransfersListView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="transfer-action-edit"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="form-editing"]').text()).toBe('6')
    await wrapper.get('[data-test="submit-form"]').trigger('click')
    await flushPromises()
    expect(store.update).toHaveBeenCalledWith(6, { amount_centavos: 1 })

    await wrapper.get('[data-test="transfer-action-status"]').trigger('click')
    await flushPromises()
    expect(store.update).toHaveBeenLastCalledWith(6, { status: 'pending' })

    await wrapper.get('[data-test="transfer-action-remove"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="confirm-action"]').text()).toBe('remove')
    await wrapper.get('[data-test="confirm-lifecycle-submit"]').trigger('click')
    await flushPromises()
    expect(store.remove).toHaveBeenCalledWith(6)
  })

  it('surfaces loading, empty, no-match, error, retry, notice, and balance feedback states', async () => {
    const wrapper = mount(TransfersListView, { global: stubs() })
    await flushPromises()
    expect(wrapper.get('[data-test="transfer-empty"]').exists()).toBe(true)

    store.error = { message: 'Falha ao carregar.' }
    store.notice = { code: 'effective_future_date', message: 'Permanece efetiva.' }
    store.lastBalanceImpact = [
      { id: 1, name: 'Conta corrente', before: 500_000, after: 400_000, delta: -100_000 },
      { id: 2, name: 'Poupança', before: 0, after: 100_000, delta: 100_000 },
    ]
    const failing = mount(TransfersListView, { global: stubs() })
    await flushPromises()

    expect(failing.get('[data-test="transfer-error"]').text()).toContain('Falha ao carregar.')
    expect(failing.get('[data-test="transfer-notice"]').text()).toContain('Permanece efetiva.')
    expect(failing.findAll('[data-test="balance-impact"]')).toHaveLength(2)
    expect(failing.get('[data-test="balance-impact"]').text()).toContain('Conta corrente')
    expect(failing.find('[data-test="transfer-empty"]').exists()).toBe(false)

    const callsBeforeRetry = store.setFilters.mock.calls.length
    await failing.get('[data-test="transfer-retry"]').trigger('click')
    await flushPromises()
    expect(store.setFilters).toHaveBeenCalledTimes(callsBeforeRetry + 1)
  })

  it('offers a distinct no-match state once filters are applied and loads more progressively', async () => {
    store.filters = { q: 'reserva', view: 'active', per_page: 50 }
    store.hasMore = true
    const wrapper = mount(TransfersListView, { global: stubs() })
    await flushPromises()

    expect(wrapper.get('[data-test="transfer-no-match"]').exists()).toBe(true)

    await wrapper.get('[data-test="load-more"]').trigger('click')
    expect(store.loadMore).toHaveBeenCalledTimes(1)
  })

  it('keeps applied and cleared criteria in the route query string', async () => {
    const wrapper = mount(TransfersListView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="apply-filter"]').trigger('click')
    await flushPromises()
    expect(routerReplace).toHaveBeenCalledWith({ query: { q: 'reserva', status: 'pending' } })
    expect(store.setFilters).toHaveBeenLastCalledWith({ q: 'reserva', status: 'pending' })

    await wrapper.get('[data-test="clear-filter"]').trigger('click')
    await flushPromises()
    expect(routerReplace).toHaveBeenLastCalledWith({ query: { view: 'active', per_page: 50 } })
    expect(store.setFilters).toHaveBeenLastCalledWith(
      expect.objectContaining({ view: 'active', per_page: 50, q: undefined, status: undefined }),
    )
  })
})
