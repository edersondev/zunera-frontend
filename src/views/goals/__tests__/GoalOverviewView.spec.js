import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { messages } from '@/i18n/messages'
import { useFinancialGoalStore } from '@/stores/goals/financialGoalStore'
import GoalOverviewView from '../GoalOverviewView.vue'

vi.mock('@/services/financialGoalService', () => ({
  newIdempotencyKey: vi.fn(() => 'key'),
  listGoals: vi.fn(), getGoalSummary: vi.fn(), getGoal: vi.fn(), getDashboardGoals: vi.fn(),
  listGoalActivities: vi.fn(), createGoal: vi.fn(), updateGoal: vi.fn(),
  allocateGoal: vi.fn(), withdrawGoal: vi.fn(), transitionGoal: vi.fn(),
}))
vi.mock('@/services/financialAccountService', () => ({ listFinancialAccounts: vi.fn(() => Promise.resolve([])) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
const service = await import('@/services/financialGoalService')
const stubs = {
  PageHeader: { props: ['title'], template: '<header><h1>{{ title }}</h1><slot name="actions" /></header>' },
  GoalFormDialog: true,
  GoalCard: { props: ['goal'], template: '<article>{{ goal.name }} {{ goal.account_backing }}</article>' },
}

function render(initialStatus = 'active') {
  const i18n = createI18n({ legacy: false, locale: 'en', messages })
  return mount(GoalOverviewView, { props: { initialStatus }, global: { plugins: [i18n, createPinia()], stubs } })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  service.listGoals.mockResolvedValue({ items: [], meta: { current_page: 1, last_page: 1 } })
  service.getGoalSummary.mockResolvedValue({
    active_target_centavos: 3000000, active_allocated_centavos: 300000,
    active_remaining_centavos: 2700000, active_unverified_centavos: 50000,
    attention_counts: { overdue_underfunded_active_goals: 1, shortfall_linked_goals: 2, inactive_or_unavailable_linked_goals: 3 },
  })
})

describe('GoalOverviewView', () => {
  it('shows exact active totals and three independent attention counts', async () => {
    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).toMatch(/R\$\s*30\.000,00/)
    expect(wrapper.text()).toMatch(/R\$\s*3\.000,00/)
    expect(wrapper.text()).toMatch(/R\$\s*27\.000,00/)
    expect(wrapper.text()).toMatch(/R\$\s*500,00/)
    expect(wrapper.text()).toContain('Overdue underfunded active goals: 1')
    expect(wrapper.text()).toContain('Goals with account shortfall: 2')
    expect(wrapper.text()).toContain('Goals linked to inactive or unavailable accounts: 3')
  })

  it('requests completed and archived filters without mixing their records', async () => {
    service.listGoals.mockResolvedValue({ items: [{ id: 2, name: 'Finished' }], meta: { current_page: 1, last_page: 1 } })
    const wrapper = render('completed')
    await flushPromises()
    expect(service.listGoals).toHaveBeenCalledWith({ status: 'completed', page: 1 })
    expect(wrapper.text()).toContain('Finished')
    expect(wrapper.text()).not.toContain('R$ 0.00')
  })

  it('keeps unknown totals hidden and offers retry after summary failure', async () => {
    service.getGoalSummary.mockRejectedValueOnce(new Error('Summary unavailable')).mockResolvedValueOnce({
      active_target_centavos: 100, active_allocated_centavos: 0, active_remaining_centavos: 100,
      active_unverified_centavos: 0, attention_counts: { overdue_underfunded_active_goals: 0, shortfall_linked_goals: 0, inactive_or_unavailable_linked_goals: 0 },
    })
    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).toContain('Summary unavailable')
    expect(wrapper.find('[data-test="goal-summary"]').exists()).toBe(false)
    await useFinancialGoalStore().fetchSummary()
    await flushPromises()
    expect(wrapper.find('[data-test="goal-summary"]').exists()).toBe(true)
  })

  it('renders hostile goal names as text', async () => {
    service.listGoals.mockResolvedValue({ items: [{ id: 3, name: '<img src=x onerror=alert(1)>', account_backing: 'unverified' }], meta: { current_page: 1, last_page: 1 } })
    const wrapper = render()
    await flushPromises()
    expect(wrapper.html()).not.toContain('<img src=x')
    expect(wrapper.text()).toContain('<img src=x')
  })
})
