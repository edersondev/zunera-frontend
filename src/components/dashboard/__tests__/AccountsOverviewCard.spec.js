import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import AccountsOverviewCard from '../AccountsOverviewCard.vue'
import { dashboardAccountsFixture } from '@/services/__tests__/fixtures/dashboardFixtures'

const stubs = {
  ElAlert: {
    name: 'ElAlert',
    props: ['title'],
    template: '<div role="alert"><p>{{ title }}</p><slot /></div>',
  },
  ElButton: {
    name: 'ElButton',
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  ElSkeleton: { name: 'ElSkeleton', template: '<div class="skeleton" />' },
  ElTag: { name: 'ElTag', template: '<span class="tag"><slot /></span>' },
  ElEmpty: {
    name: 'ElEmpty',
    props: ['description'],
    template: '<div class="empty"><p>{{ description }}</p><slot /></div>',
  },
}

function mountCard(props = {}) {
  return mount(AccountsOverviewCard, {
    props: { accounts: dashboardAccountsFixture(), ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('AccountsOverviewCard', () => {
  it('shows every active account with its balance and signed allocation share', () => {
    const wrapper = mountCard({
      accounts: {
        current_total_balance: { amount_centavos: 100_000, currency_code: 'BRL' },
        accounts: [
          {
            account: { id: 1, name: 'Crédito', type: 'checking', status: 'active' },
            current_balance: { amount_centavos: 200_000, currency_code: 'BRL' },
            allocation_percent: 200,
          },
          {
            account: { id: 2, name: 'Dívida', type: 'other', status: 'active' },
            current_balance: { amount_centavos: -100_000, currency_code: 'BRL' },
            allocation_percent: -100,
          },
        ],
      },
    })

    const rows = wrapper.findAll('[data-test="dashboard-accounts-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].get('[data-test="dashboard-accounts-balance"]').text()).toContain('2.000,00')
    expect(rows[0].get('[data-test="dashboard-accounts-allocation"]').text()).toBe('200%')
    expect(rows[1].get('[data-test="dashboard-accounts-allocation"]').text()).toBe('-100%')
    expect(wrapper.get('[data-test="dashboard-accounts-total"]').text()).toContain('1.000,00')
  })

  it('explains an unavailable allocation when the combined balance is zero', () => {
    const wrapper = mountCard({
      accounts: {
        current_total_balance: { amount_centavos: 0, currency_code: 'BRL' },
        accounts: [
          {
            account: { id: 1, name: 'Crédito', type: 'checking', status: 'active' },
            current_balance: { amount_centavos: 100_000, currency_code: 'BRL' },
            allocation_percent: null,
          },
        ],
      },
    })

    expect(wrapper.get('[data-test="dashboard-accounts-allocation"]').text()).toBe(
      'Participação indisponível',
    )
  })

  it('offers a call to action when the user has no active account', async () => {
    const wrapper = mountCard({
      accounts: {
        current_total_balance: { amount_centavos: 0, currency_code: 'BRL' },
        accounts: [],
      },
    })

    expect(wrapper.get('[data-test="dashboard-accounts-empty"]').text()).toContain(
      'Nenhuma conta ativa ainda.',
    )

    await wrapper.get('[data-test="dashboard-accounts-empty"] button').trigger('click')

    expect(wrapper.emitted('create-account')).toHaveLength(1)
  })

  it('retries independently after a section failure', async () => {
    const wrapper = mountCard({ accounts: null, error: new Error('boom') })

    await wrapper.get('[data-test="dashboard-accounts-retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
