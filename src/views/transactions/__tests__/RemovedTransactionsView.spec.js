import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import RemovedTransactionsView from '../RemovedTransactionsView.vue'
import { i18n } from '@/i18n'

const store = vi.hoisted(() => ({
  items: [],
  loading: false,
  error: null,
  setFilters: vi.fn(),
  restore: vi.fn(),
}))
const routerPush = vi.hoisted(() => vi.fn())

vi.mock('@/stores/transactions/transactionStore', () => ({
  useTransactionStore: () => store,
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

function stubs() {
  return {
    plugins: [ElementPlus, i18n],
    stubs: {
      PageHeader: {
        props: ['title', 'description'],
        template: '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name="actions" /></header>',
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

  it('returns to the active transactions page', async () => {
    const wrapper = mount(RemovedTransactionsView, { global: stubs() })
    await flushPromises()

    expect(wrapper.get('[data-test="back-to-transactions"]').text()).toContain('Transações')
    expect(wrapper.get('[data-test="back-to-transactions"] svg').exists()).toBe(true)

    await wrapper.get('[data-test="back-to-transactions"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({ name: 'transactions' })
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

  it('renders existing transfer rows safely while removed transactions load', async () => {
    store.items = [
      {
        id: 9,
        movement_kind: 'transfer',
        description: 'Reserva',
        amount_centavos: 500,
        movement_date: '2026-09-01',
      },
    ]

    const wrapper = mount(RemovedTransactionsView, { global: stubs() })
    await flushPromises()

    expect(wrapper.text()).toContain('1 de set. de 2026')
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
