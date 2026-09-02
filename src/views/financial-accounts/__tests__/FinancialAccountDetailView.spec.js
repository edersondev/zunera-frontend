import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import FinancialAccountDetailView from '../FinancialAccountDetailView.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '7' } }),
}))

const store = vi.hoisted(() => ({
  accounts: [],
  archivedAccounts: [],
  summary: { active_account_count: 1, active_combined_balance_centavos: 5000, currency_code: 'BRL' },
  selectedAccount: null,
  loading: false,
  creating: false,
  updating: false,
  lifecycleLoading: false,
  error: null,
  validationErrors: {},
  fetchAccounts: vi.fn(),
  fetchSummary: vi.fn(),
  fetchAccount: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
  restore: vi.fn(),
}))

vi.mock('@/stores/financial-accounts/financialAccountStore', () => ({
  useFinancialAccountStore: () => store,
}))

describe('FinancialAccountDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.error = null
  })

  it('loads the selected account and summary on mount', async () => {
    store.selectedAccount = account()
    const wrapper = mount(FinancialAccountDetailView, { global: stubs() })
    await flushPromises()

    expect(store.fetchAccount).toHaveBeenCalledWith(7)
    expect(store.fetchSummary).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Conta principal')
  })

  it('submits account edits to the store', async () => {
    store.selectedAccount = account()
    store.update.mockResolvedValue({ ...account(), name: 'Conta nova' })
    const wrapper = mount(FinancialAccountDetailView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="submit-edit"]').trigger('click')
    await flushPromises()

    expect(store.update).toHaveBeenCalledWith(7, { name: 'Conta nova' })
    expect(wrapper.text()).toContain('Account details saved.')
  })

  it('shows the restore action for archived accounts', async () => {
    store.selectedAccount = { ...account(), status: 'archived' }
    const wrapper = mount(FinancialAccountDetailView, { global: stubs() })
    await flushPromises()

    expect(wrapper.text()).toContain('Restore account')
  })
})

function account() {
  return {
    id: 7,
    name: 'Conta principal',
    account_type: 'checking',
    status: 'active',
    institution_name: 'Nubank',
    color: 'teal',
    icon: 'wallet',
    initial_balance_centavos: 1000,
    current_balance_centavos: 1000,
    has_financial_movements: false,
  }
}

function stubs() {
  return {
    stubs: {
      PageHeader: {
        props: ['title', 'description'],
        template: '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name="actions" /></header>',
      },
      FinancialAccountForm: {
        emits: ['submit'],
        template: '<button data-test="submit-edit" @click="$emit(\'submit\', { name: \'Conta nova\' })">Save</button>',
      },
      FinancialAccountLifecycleDialog: { template: '<div />' },
      ElEmpty: { template: '<div />' },
    },
    plugins: [ElementPlus],
  }
}
