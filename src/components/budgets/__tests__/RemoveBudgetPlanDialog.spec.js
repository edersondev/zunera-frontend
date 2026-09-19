import { describe, expect, it } from 'vitest'
import { Close, Delete } from '@element-plus/icons-vue'
import { mount } from '@vue/test-utils'
import RemoveBudgetPlanDialog from '../RemoveBudgetPlanDialog.vue'

const stubs = {
  ElDialog: {
    name: 'ElDialog',
    props: ['modelValue', 'title'],
    template: '<section role="dialog"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>',
  },
  ElButton: {
    name: 'ElButton',
    props: ['disabled', 'icon', 'type'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
}

describe('RemoveBudgetPlanDialog', () => {
  it('uses the documented cancel button treatment', () => {
    const wrapper = mount(RemoveBudgetPlanDialog, {
      props: { modelValue: true, submitting: true },
      global: { stubs },
    })
    const cancelButton = wrapper
      .findAllComponents({ name: 'ElButton' })
      .find((button) => button.text() === 'Cancelar')

    expect(cancelButton?.props('type')).toBe('danger')
    expect(cancelButton?.props('icon')).toBe(Close)
    expect(cancelButton?.props('disabled')).toBe(true)
  })

  it('uses an info remove action with a delete icon', () => {
    const wrapper = mount(RemoveBudgetPlanDialog, {
      props: { modelValue: true },
      global: { stubs },
    })
    const removeButton = wrapper
      .findAllComponents({ name: 'ElButton' })
      .find((button) => button.text() === 'Remover')

    expect(removeButton?.props('type')).toBe('info')
    expect(removeButton?.props('icon')).toBe(Delete)
  })
})
