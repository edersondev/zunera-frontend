import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import ArchivedFinancialAccountsView from '../ArchivedFinancialAccountsView.vue'

const store = vi.hoisted(() => ({
  accounts: [],
  archivedAccounts: [],
  summary: { active_account_count: 0, active_combined_balance_centavos: 0, currency_code: 'BRL' },
  selectedAccount: null,
  loading: false,
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

describe('ArchivedFinancialAccountsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.archivedAccounts = []
    store.error = null
  })

  it('loads archived accounts on mount', async () => {
    const wrapper = mount(ArchivedFinancialAccountsView, { global: stubs() })
    await flushPromises()

    expect(store.fetchAccounts).toHaveBeenCalledWith('archived')
    expect(wrapper.text()).toContain('Archived accounts')
  })

  it('restores an archived account after confirmation', async () => {
    const archived = { id: 3, name: 'Reserva', status: 'archived' }
    store.archivedAccounts = [archived]
    store.restore.mockResolvedValue({ ...archived, status: 'active' })
    const wrapper = mount(ArchivedFinancialAccountsView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="restore-account"]').trigger('click')
    await wrapper.get('[data-test="confirm-restore"]').trigger('click')
    await flushPromises()

    expect(store.restore).toHaveBeenCalledWith(archived)
    expect(wrapper.text()).toContain('Financial account restored.')
  })
})

function stubs() {
  return {
    stubs: {
      PageHeader: {
        props: ['title', 'description'],
        template: '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name="actions" /></header>',
      },
      FinancialAccountList: {
        props: ['accounts'],
        emits: ['restore'],
        template: '<button v-for="account in accounts" :key="account.id" data-test="restore-account" @click="$emit(\'restore\', account)">Restore</button>',
      },
      FinancialAccountLifecycleDialog: {
        props: ['visible'],
        emits: ['confirm'],
        template: '<button v-if="visible" data-test="confirm-restore" @click="$emit(\'confirm\')">Confirm</button>',
      },
    },
    plugins: [ElementPlus],
  }
}
