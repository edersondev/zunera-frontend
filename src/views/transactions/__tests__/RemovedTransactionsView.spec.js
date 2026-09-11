import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import RemovedTransactionsView from '../RemovedTransactionsView.vue'

const store = vi.hoisted(() => ({
  items: [],
  loading: false,
  error: null,
  setFilters: vi.fn(),
  restore: vi.fn(),
}))

vi.mock('@/stores/transactions/transactionStore', () => ({
  useTransactionStore: () => store,
}))

function stubs() {
  return {
    plugins: [ElementPlus],
    stubs: {
      PageHeader: {
        props: ['title', 'description'],
        template: '<header><h1>{{ title }}</h1><p>{{ description }}</p></header>',
      },
      teleport: true,
    },
  }
}

describe('RemovedTransactionsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.items = []
    store.error = null
    store.setFilters.mockResolvedValue({})
  })

  it('loads the removed view on mount and lists removed transactions', async () => {
    store.items = [
      {
        id: 4,
        description: 'Água',
        amount_centavos: 200,
        type: 'expense',
        transaction_date: '2026-09-01',
      },
    ]
    const wrapper = mount(RemovedTransactionsView, { global: stubs() })
    await flushPromises()

    expect(store.setFilters).toHaveBeenCalledWith({ view: 'removed' })
    expect(wrapper.text()).toContain('Água')
    expect(wrapper.find('[data-test="removed-empty"]').exists()).toBe(false)
  })

  it('restores a transaction and confirms it', async () => {
    store.items = [
      {
        id: 4,
        description: 'Água',
        amount_centavos: 200,
        type: 'expense',
        transaction_date: '2026-09-01',
      },
    ]
    store.restore.mockResolvedValue({ id: 4 })
    const wrapper = mount(RemovedTransactionsView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="restore-transaction"]').trigger('click')
    await flushPromises()

    expect(store.restore).toHaveBeenCalledWith(4, {})
    expect(wrapper.get('[data-test="removed-feedback"]').text()).toContain(
      'Transação restaurada.',
    )
  })

  it('reports a rejected restore', async () => {
    store.items = [
      {
        id: 4,
        description: 'Água',
        amount_centavos: 200,
        type: 'expense',
        transaction_date: '2026-09-01',
      },
    ]
    store.restore.mockRejectedValue(new Error('Restore rejected.'))
    const wrapper = mount(RemovedTransactionsView, { global: stubs() })
    await flushPromises()

    await wrapper.get('[data-test="restore-transaction"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="removed-feedback"]').text()).toContain('Restore rejected.')
  })

  it('shows the empty state when no transaction was removed', async () => {
    const wrapper = mount(RemovedTransactionsView, { global: stubs() })
    await flushPromises()

    expect(store.setFilters).toHaveBeenCalledWith({ view: 'removed' })
    expect(wrapper.get('[data-test="removed-empty"]').exists()).toBe(true)
  })
})
