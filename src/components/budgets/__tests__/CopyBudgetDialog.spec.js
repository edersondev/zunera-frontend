import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import CopyBudgetDialog from '../CopyBudgetDialog.vue'

const ElForm = defineComponent({
  name: 'ElForm',
  setup(_, { slots }) {
    return { validate: () => Promise.resolve(true), slots }
  },
  template: '<form><slot /></form>',
})

const stubs = {
  ElDialog: {
    name: 'ElDialog',
    props: ['modelValue', 'title'],
    template: '<section role="dialog"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>',
  },
  ElForm,
  ElFormItem: {
    name: 'ElFormItem',
    props: ['label'],
    template: '<label><span>{{ label }}</span><slot /></label>',
  },
  ElSelect: defineComponent({
    name: 'ElSelect',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', Number($event.target.value))"><slot /></select>',
  }),
  ElOption: defineComponent({
    name: 'ElOption',
    props: ['value', 'label'],
    template: '<option :value="value">{{ label }}</option>',
  }),
  ElButton: {
    name: 'ElButton',
    props: ['disabled'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  ElAlert: {
    name: 'ElAlert',
    props: ['title'],
    template: '<div role="alert">{{ title }}</div>',
  },
}

function mountDialog(props = {}) {
  return mount(CopyBudgetDialog, {
    props: { modelValue: true, sourceMonth: { year: 2026, month: 9 }, ...props },
    global: { stubs },
  })
}

describe('CopyBudgetDialog', () => {
  it('defaults to the following month and emits the destination', async () => {
    const wrapper = mountDialog()
    const selects = wrapper.findAll('select')

    expect(selects[0].element.value).toBe('2026')
    expect(selects[1].element.value).toBe('10')

    await wrapper.get('[data-test="budget-copy-confirm"]').trigger('click')

    expect(wrapper.emitted('copy')[0][0]).toEqual({ year: 2026, month: 10 })
  })

  it('rolls a December source into January of the next year', () => {
    const wrapper = mountDialog({ sourceMonth: { year: 2026, month: 12 } })
    const selects = wrapper.findAll('select')

    expect(selects[0].element.value).toBe('2027')
    expect(selects[1].element.value).toBe('1')
  })

  it('refuses a destination equal to the source month', async () => {
    const wrapper = mountDialog()
    const selects = wrapper.findAll('select')

    await selects[1].setValue('9')
    await wrapper.get('[data-test="budget-copy-confirm"]').trigger('click')

    expect(wrapper.emitted('copy')).toBeUndefined()
    expect(wrapper.text()).toContain('diferente do mês de origem')
  })

  it('shows the conflict message returned by the server', () => {
    const wrapper = mountDialog({ error: { message: 'O mês de destino já possui um orçamento.' } })

    expect(wrapper.get('[role="alert"]').text()).toContain('já possui um orçamento')
  })
})
