import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RecurringTransactionsListView from '../RecurringTransactionsListView.vue'
import { i18n } from '@/i18n'

const store = vi.hoisted(() => ({
  filters: { per_page: 50 },
  items: [],
  loading: false,
  saving: false,
  hasMore: false,
  selected: null,
  occurrences: [],
  loadingOccurrences: false,
  validationErrors: {},
  notice: null,
  error: null,
  setFilters: vi.fn(),
  clearFeedback: vi.fn(),
}))
const accounts = vi.hoisted(() => ({ accounts: [], archivedAccounts: [], fetchAccounts: vi.fn() }))
const categories = vi.hoisted(() => ({ categories: [], archivedCategories: [], fetchCategories: vi.fn() }))

vi.mock('@/stores/recurring-transactions/recurringTransactionStore', () => ({
  useRecurringTransactionStore: () => store,
}))
vi.mock('@/stores/financial-accounts/financialAccountStore', () => ({
  useFinancialAccountStore: () => accounts,
}))
vi.mock('@/stores/categories/categoryStore', () => ({ useCategoryStore: () => categories }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const stubs = {
  PageHeader: { template: '<header><slot /><slot name="actions" /></header>' },
  ElButton: {
    props: ['type'],
    emits: ['click'],
    template: '<button :data-type="type" @click="$emit(\'click\')"><slot /></button>',
  },
  ElAlert: { template: '<div><slot /></div>' },
  ElTag: { template: '<span><slot /></span>' },
  RecurringTransactionFilterBar: { template: '<div />' },
  RecurringTransactionList: { template: '<div />' },
  RecurringTransactionFormDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue" data-test="recurrence-form-dialog" />',
  },
  RecurringTransactionLifecycleDialog: { template: '<div />' },
  RecurringTransactionDetailDrawer: { template: '<div />' },
}

describe('RecurringTransactionsListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.loading = false
    store.setFilters.mockResolvedValue({})
    accounts.fetchAccounts.mockResolvedValue({})
    categories.fetchCategories.mockResolvedValue({})
  })

  it('places the new recurring action in the page header', async () => {
    const wrapper = mount(RecurringTransactionsListView, { global: { plugins: [i18n], stubs } })
    await flushPromises()

    const create = wrapper.get('header [data-test="recurrence-new"]')
    expect(create.text()).toBe('Nova recorrência')
    expect(create.attributes('data-type')).toBe('primary')
    expect(wrapper.find('[data-test="recurrence-reload"]').exists()).toBe(false)

    await create.trigger('click')

    expect(store.clearFeedback).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-test="recurrence-form-dialog"]').exists()).toBe(true)
  })
})
