import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import RemovedTransfersView from '../RemovedTransfersView.vue'
import { i18n } from '@/i18n'

const store = vi.hoisted(() => ({
  items: [],
  meta: { total: 0, current_page: 1, last_page: 1 },
  loading: false,
  saving: false,
  error: null,
  notice: null,
  lastBalanceImpact: [],
  hasMore: false,
  setFilters: vi.fn(),
  loadMore: vi.fn(),
  restore: vi.fn(),
}))
const accounts = vi.hoisted(() => ({ fetchAccounts: vi.fn() }))
const routerPush = vi.hoisted(() => vi.fn())

vi.mock('@/stores/transfers/transferStore', () => ({ useTransferStore: () => store }))
vi.mock('@/stores/financial-accounts/financialAccountStore', () => ({
  useFinancialAccountStore: () => accounts,
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: routerPush }) }))

describe('RemovedTransfersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.setFilters.mockResolvedValue({})
    accounts.fetchAccounts.mockResolvedValue({})
  })

  it('starts with a clean removed query rather than retaining hidden active filters', async () => {
    mount(RemovedTransfersView, {
      global: {
        plugins: [ElementPlus, i18n],
        stubs: {
          PageHeader: { template: '<header><slot name="actions" /></header>' },
          TransferLifecycleConfirmDialog: true,
          RemovedTransferCard: true,
        },
      },
    })
    await flushPromises()

    expect(store.setFilters).toHaveBeenCalledWith({
      view: 'removed',
      per_page: 50,
      q: undefined,
      status: undefined,
      source_financial_account_id: undefined,
      destination_financial_account_id: undefined,
      from: undefined,
      to: undefined,
    })
  })
})
