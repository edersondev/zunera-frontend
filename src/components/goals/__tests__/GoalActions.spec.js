import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { messages } from '@/i18n/messages'
import GoalActions from '../GoalActions.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages })
const mountActions = (status, availableActions) => mount(GoalActions, { global: { plugins: [i18n] }, props: { goal: { status }, availableActions } })

describe('GoalActions', () => {
  it('keeps money actions prominent and archive unavailable while money is allocated', async () => {
    const wrapper = mountActions('active', ['allocate', 'withdraw', 'update', 'complete'])
    expect(wrapper.get('[data-test="allocate-goal"]').classes()).toContain('el-button--primary')
    expect(wrapper.get('[data-test="archive-goal"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Release the full designated amount')
    await wrapper.get('[data-test="withdraw-goal"]').trigger('click')
    expect(wrapper.emitted('amount')?.[0]).toEqual(['withdraw'])
  })

  it('shows only the allowed lifecycle action for completed and archived goals', () => {
    const completed = mountActions('completed', ['reopen'])
    expect(completed.text()).toContain('Reopen')
    expect(completed.find('[data-test="allocate-goal"]').exists()).toBe(false)
    const archived = mountActions('archived', ['restore'])
    expect(archived.text()).toContain('Restore')
  })
})
