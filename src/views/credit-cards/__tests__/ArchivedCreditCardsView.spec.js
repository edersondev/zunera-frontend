import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ArchivedCreditCardsView from '../ArchivedCreditCardsView.vue'

const store = vi.hoisted(() => ({
  archivedCards: [],
  loading: false,
  submitting: false,
  error: null,
  mutationError: null,
  fetchCards: vi.fn(),
  restoreCard: vi.fn(),
}))
const routerPush = vi.hoisted(() => vi.fn())

vi.mock('@/stores/credit-cards/creditCardStore', () => ({
  useCreditCardStore: () => store,
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

const card = {
  id: 7,
  name: 'Nubank',
  last_four: '1234',
  institution_name: 'Nubank',
  summary: { credit_limit: { amount_centavos: 500_000 } },
}

describe('ArchivedCreditCardsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.archivedCards = []
    store.error = null
    store.mutationError = null
  })

  it('loads archived cards and returns to active cards', async () => {
    const wrapper = mount(ArchivedCreditCardsView, { global: { plugins: [i18n], stubs } })
    await flushPromises()

    expect(store.fetchCards).toHaveBeenCalledWith('archived')
    await wrapper.get('[data-test="credit-cards-archived-back"]').trigger('click')
    expect(routerPush).toHaveBeenCalledWith({ name: 'credit-cards' })
  })

  it('restores an archived card after confirmation', async () => {
    store.archivedCards = [card]
    store.restoreCard.mockResolvedValue({ ok: true })
    const wrapper = mount(ArchivedCreditCardsView, { global: { plugins: [i18n], stubs } })
    await flushPromises()

    await wrapper.get('[data-test="credit-card-restore-7"]').trigger('click')
    await wrapper.get('[data-test="credit-card-restore-confirm"]').trigger('click')
    await flushPromises()

    expect(store.restoreCard).toHaveBeenCalledWith(7)
    expect(wrapper.text()).toContain('Cartão restaurado.')
  })
})

const stubs = {
  PageHeader: {
    props: ['title', 'description'],
    template:
      '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name="actions" /></header>',
  },
  ElButton: {
    props: ['icon', 'loading', 'disabled', 'type'],
    template:
      '<button :data-icon="icon?.name" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  ElDialog: {
    props: ['modelValue', 'title'],
    template:
      '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><footer><slot name="footer" /></footer></section>',
  },
  ElAlert: { props: ['title'], template: '<p>{{ title }}</p>' },
  ElEmpty: true,
  ElSkeleton: true,
}
