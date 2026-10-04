import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountDataActionDialog from '../AccountDataActionDialog.vue'

const FormStub = defineComponent({
  props: ['model'],
  setup(props, { slots, expose }) {
    expose({ validate: async () => Boolean(props.model.current_password), clearValidate: () => {} })
    return () => h('form', slots.default?.())
  },
})
const stubs = {
  ElDialog: { template: '<section><slot /><slot name="footer" /></section>' },
  ElAlert: { props: ['title'], template: '<p>{{ title }}</p>' },
  ElForm: FormStub,
  ElFormItem: { props: ['label'], template: '<label>{{ label }}<slot /></label>' },
  ElInput: {
    props: ['modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElButton: { props: ['type'], template: '<button :data-type="type"><slot /></button>' },
}

describe('account data confirmation', () => {
  it('archives with clear saved-data message and no password', async () => {
    const wrapper = mount(AccountDataActionDialog, {
      props: { modelValue: true, mode: 'archive' }, global: { stubs },
    })
    expect(wrapper.text()).toContain('salvos no arquivo')
    expect(wrapper.find('input').exists()).toBe(false)
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('confirm')?.[0]).toEqual([''])
  })

  it('requires current password and warns deletion cannot be restored', async () => {
    const wrapper = mount(AccountDataActionDialog, {
      props: { modelValue: true, mode: 'delete' }, global: { stubs },
    })
    expect(wrapper.text()).toContain('não poderão ser restaurados')
    expect(wrapper.findAll('button')[0].attributes('data-type')).toBe('danger')
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('confirm')).toBeUndefined()
    await wrapper.find('input').setValue('current secret')
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('confirm')?.[0]).toEqual(['current secret'])
  })
})
