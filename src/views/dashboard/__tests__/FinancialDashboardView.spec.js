import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import DashboardPeriodSelector from '@/components/dashboard/DashboardPeriodSelector.vue'

vi.mock('@/services/dashboardService', () => ({
  getDashboardAccounts: vi.fn(),
  getDashboardEvolution: vi.fn(),
  getDashboardExpenseDistribution: vi.fn(),
  getDashboardRecentActivity: vi.fn(),
  getDashboardSummary: vi.fn(),
  getDashboardUpcomingActivity: vi.fn(),
}))

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

const {
  getDashboardAccounts,
  getDashboardEvolution,
  getDashboardExpenseDistribution,
  getDashboardRecentActivity,
  getDashboardSummary,
  getDashboardUpcomingActivity,
} = await import('@/services/dashboardService')

const {
  dashboardAccountsFixture,
  dashboardDistributionFixture,
  dashboardEvolutionFixture,
  dashboardRecentActivityFixture,
  dashboardSummaryFixture,
  dashboardUpcomingActivityFixture,
} = await import('@/services/__tests__/fixtures/dashboardFixtures')

const FinancialDashboardView = (await import('../FinancialDashboardView.vue')).default

const stubs = {
  ElAlert: {
    name: 'ElAlert',
    props: ['title'],
    template: '<div role="alert"><p>{{ title }}</p><slot /></div>',
  },
  ElButton: {
    name: 'ElButton',
    props: ['disabled', 'loading'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  ElSkeleton: { name: 'ElSkeleton', template: '<div class="skeleton" />' },
  ElTag: { name: 'ElTag', template: '<span class="tag"><slot /></span>' },
  ElEmpty: {
    name: 'ElEmpty',
    props: ['description'],
    template: '<div class="empty"><p>{{ description }}</p><slot /></div>',
  },
  ElRadioGroup: {
    name: 'ElRadioGroup',
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue', 'change'],
    template: '<div class="radio-group"><slot /></div>',
  },
  ElRadioButton: {
    name: 'ElRadioButton',
    props: ['value'],
    template: '<label class="radio-button"><slot /></label>',
  },
  ElDatePicker: {
    name: 'ElDatePicker',
    props: ['modelValue', 'id'],
    emits: ['update:modelValue'],
    template:
      '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  RouterLink: {
    name: 'RouterLink',
    props: ['to'],
    template: '<a><slot /></a>',
  },
  BaseChart: {
    name: 'BaseChart',
    props: ['label'],
    template: '<div role="img" :aria-label="label" />',
  },
}

function mockHappyPath() {
  getDashboardSummary.mockResolvedValue(dashboardSummaryFixture())
  getDashboardAccounts.mockResolvedValue(dashboardAccountsFixture())
  getDashboardExpenseDistribution.mockResolvedValue(dashboardDistributionFixture())
  getDashboardEvolution.mockResolvedValue(dashboardEvolutionFixture())
  getDashboardRecentActivity.mockResolvedValue(dashboardRecentActivityFixture())
  getDashboardUpcomingActivity.mockResolvedValue(dashboardUpcomingActivityFixture())
}

async function mountView() {
  const wrapper = mount(FinancialDashboardView, {
    global: { plugins: [createPinia(), i18n], stubs },
  })
  await flushPromises()

  return wrapper
}

describe('FinancialDashboardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockHappyPath()
  })

  it('loads all six projections on open and labels the current position apart from the period', async () => {
    const wrapper = await mountView()

    expect(getDashboardSummary).toHaveBeenCalledTimes(1)
    expect(getDashboardAccounts).toHaveBeenCalledTimes(1)
    expect(getDashboardExpenseDistribution).toHaveBeenCalledTimes(1)
    expect(getDashboardEvolution).toHaveBeenCalledTimes(1)
    expect(getDashboardRecentActivity).toHaveBeenCalledTimes(1)
    expect(getDashboardUpcomingActivity).toHaveBeenCalledTimes(1)

    expect(wrapper.get('[data-test="dashboard-summary-balance-value"]').text()).toContain(
      '5.000,00',
    )
    expect(wrapper.get('[data-test="dashboard-summary-balance"]').text()).toContain(
      'Saldo das contas ativas agora; não muda com o período.',
    )
    expect(wrapper.get('[data-test="dashboard-accounts-total"]').text()).toContain('5.000,00')
    expect(wrapper.findAll('[data-test="dashboard-recent-row"]').length).toBeGreaterThan(0)
    expect(wrapper.findAll('[data-test="dashboard-upcoming-row"]').length).toBeGreaterThan(0)

    const recentCard = wrapper.get('[data-test="dashboard-recent-row"]').element.closest('section')
    const evolutionCard = wrapper
      .get('[data-test="dashboard-evolution-chart"]')
      .element.closest('section')
    const upcomingCard = wrapper
      .get('[data-test="dashboard-upcoming-row"]')
      .element.closest('section')

    expect(recentCard?.previousElementSibling?.classList.contains('dashboard-grid')).toBe(true)
    expect(wrapper.find('.dashboard-grid [data-test="dashboard-recent-row"]').exists()).toBe(false)
    expect(evolutionCard?.classList.contains('dashboard-evolution-card')).toBe(true)
    expect(upcomingCard?.classList.contains('dashboard-upcoming-card')).toBe(true)
  })

  it('keeps reliable sections usable when one section fails and retries only that section', async () => {
    getDashboardAccounts.mockRejectedValueOnce(new Error('accounts offline'))
    const wrapper = await mountView()

    expect(wrapper.get('[data-test="dashboard-accounts-error"]').text()).toContain(
      'Não foi possível carregar as contas ativas.',
    )
    expect(wrapper.get('[data-test="dashboard-summary-balance-value"]').text()).toContain(
      '5.000,00',
    )
    expect(wrapper.find('[data-test="dashboard-distribution-row"]').exists()).toBe(true)

    await wrapper.get('[data-test="dashboard-accounts-retry"]').trigger('click')
    await flushPromises()

    expect(getDashboardAccounts).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-test="dashboard-accounts-error"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="dashboard-accounts-total"]').text()).toContain('5.000,00')
    expect(getDashboardSummary).toHaveBeenCalledTimes(1)
  })

  it('reloads only period scoped sections when the preset changes', async () => {
    const wrapper = await mountView()

    wrapper.findComponent(DashboardPeriodSelector).vm.$emit('select-preset', 'previous_month')
    await flushPromises()

    expect(getDashboardSummary).toHaveBeenCalledTimes(2)
    expect(getDashboardExpenseDistribution).toHaveBeenCalledTimes(2)
    expect(getDashboardEvolution).toHaveBeenCalledTimes(2)
    expect(getDashboardSummary).toHaveBeenLastCalledWith({
      preset: 'previous_month',
      from: null,
      to: null,
    })
    expect(getDashboardAccounts).toHaveBeenCalledTimes(1)
    expect(getDashboardRecentActivity).toHaveBeenCalledTimes(1)
    expect(getDashboardUpcomingActivity).toHaveBeenCalledTimes(1)
  })

  it('applies an inclusive custom range to every period projection', async () => {
    const wrapper = await mountView()
    const selector = wrapper.findComponent(DashboardPeriodSelector)

    selector.getComponent({ name: 'ElRadioGroup' }).vm.$emit('change', 'custom')
    await wrapper.vm.$nextTick()
    await wrapper.get('#dashboard-period-from').setValue('2026-09-01')
    await wrapper.get('#dashboard-period-to').setValue('2026-09-03')
    await wrapper.get('[data-test="dashboard-period-apply"]').trigger('click')
    await flushPromises()

    expect(getDashboardSummary).toHaveBeenLastCalledWith({
      preset: 'custom',
      from: '2026-09-01',
      to: '2026-09-03',
    })
    expect(getDashboardEvolution).toHaveBeenLastCalledWith({
      preset: 'custom',
      from: '2026-09-01',
      to: '2026-09-03',
    })
  })

  it('sends the user to account creation when there is no active account', async () => {
    getDashboardAccounts.mockResolvedValue({
      current_total_balance: { amount_centavos: 0, currency_code: 'BRL' },
      accounts: [],
    })
    const wrapper = await mountView()

    await wrapper.get('[data-test="dashboard-accounts-empty"] button').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'financial-accounts' })
  })
})
