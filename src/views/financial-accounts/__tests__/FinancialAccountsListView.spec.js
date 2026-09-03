import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import FinancialAccountsListView from '../FinancialAccountsListView.vue'

const store = vi.hoisted(() => ({
  accounts: [],
  archivedAccounts: [],
  summary: { active_account_count: 0, active_combined_balance_centavos: 0, currency_code: 'BRL' },
  selectedAccount: null,
  loading: false,
  creating: false,
  updating: false,
  lifecycleLoading: false,
  error: null,
  validationErrors: {},
  fetchAccounts: vi.fn(),
  fetchSummary: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
  restore: vi.fn(),
}))

vi.mock('@/stores/financial-accounts/financialAccountStore', () => ({
  useFinancialAccountStore: () => store,
}))

describe('FinancialAccountsListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.accounts = []
    store.error = null
  })

  it('loads active accounts and the summary on mount', async () => {
    const wrapper = mount(FinancialAccountsListView, { global: stubs() })
    await flushPromises()

    expect(store.fetchAccounts).toHaveBeenCalledWith('active')
    expect(store.fetchSummary).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Financial accounts')
  })

  it('creates an account from the form and shows success feedback', async () => {
    store.create.mockResolvedValue({ id: 1, name: 'Conta' })
    const wrapper = mount(FinancialAccountsListView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="open-create-account"]').trigger('click')
    expect(wrapper.get('[data-test="create-account"]').text()).toBe('Create account')
    await wrapper.get('#create-financial-account-form').trigger('submit')
    await flushPromises()

    expect(store.create).toHaveBeenCalledWith({ name: 'Conta principal' })
    expect(wrapper.text()).toContain('Financial account created.')
  })

  it('shows server errors returned by create', async () => {
    store.create.mockRejectedValue(
      Object.assign(new Error('Conflict.'), { code: 'account_name_conflict' }),
    )
    store.error = { message: 'An active account with this name already exists.' }
    const wrapper = mount(FinancialAccountsListView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="open-create-account"]').trigger('click')
    await wrapper.get('#create-financial-account-form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('An active account with this name already exists.')
  })

  it('opens an edit dialog from an active account and saves changes', async () => {
    store.update.mockResolvedValue({ id: 1, name: 'Conta nova' })
    const wrapper = mount(FinancialAccountsListView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="edit-account"]').trigger('click')
    await wrapper.get('#edit-financial-account-form').trigger('submit')
    await flushPromises()

    expect(store.update).toHaveBeenCalledWith(1, { name: 'Conta principal' })
    expect(wrapper.text()).toContain('Account details saved.')
  })
})

function stubs() {
  return {
    stubs: {
      PageHeader: {
        props: ['title', 'description'],
        template:
          '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name="actions" /></header>',
      },
      FinancialAccountSummary: { template: '<div />' },
      FinancialAccountList: {
        emits: ['edit'],
        template:
          '<button data-test="edit-account" @click="$emit(\'edit\', { id: 1, name: \'Conta principal\' })">Conta principal</button>',
      },
      FinancialAccountForm: {
        props: ['formId'],
        emits: ['submit'],
        template:
          '<form :id="formId" @submit.prevent="$emit(\'submit\', { name: \'Conta principal\' })"></form>',
      },
      FinancialAccountLifecycleDialog: { template: '<div />' },
      ElDialog: {
        props: ['modelValue', 'title'],
        template:
          '<section v-if="modelValue" role="dialog"><h2>{{ title }}</h2><slot /><footer><slot name="footer" /></footer></section>',
      },
    },
    plugins: [ElementPlus],
  }
}
