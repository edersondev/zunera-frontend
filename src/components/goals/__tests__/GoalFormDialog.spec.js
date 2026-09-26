import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { messages } from '@/i18n/messages'
import GoalFormDialog from '../GoalFormDialog.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages })
const dialogStub = { template: '<div><slot /></div>' }

describe('GoalFormDialog', () => {
  it('omits unchanged overdue date and inactive account from metadata edits', async () => {
    const goal = {
      id: 7, name: 'Trip', target_centavos: 1000, target_date: '2025-01-01',
      financial_account: { id: 3, name: 'Archived savings', status: 'archived' }, description: 'Old note',
    }
    const wrapper = mount(GoalFormDialog, {
      props: { modelValue: false, goal, accounts: [] },
      global: { plugins: [i18n], stubs: { ElDialog: dialogStub } },
    })

    await wrapper.setProps({ modelValue: true })
    await wrapper.get('input[name="name"]').setValue('New trip')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({ name: 'New trip' })
  })
})
