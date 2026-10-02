import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordStrength from '../PasswordStrength.vue'

describe('PasswordStrength', () => {
  it('renders localized labels and updates reactively', async () => {
    const wrapper = mount(PasswordStrength, { props: { password: '' } })
    const meter = wrapper.get('[role="progressbar"]')
    expect(meter.attributes('aria-valuemin')).toBe('0')
    expect(meter.attributes('aria-valuemax')).toBe('4')
    expect(wrapper.text()).toContain('Digite uma senha')

    await wrapper.setProps({ password: 'password' })
    expect(wrapper.text()).toContain('Muito fraca')
    expect(meter.attributes('aria-valuenow')).toBe('0')

    for (const [password, label, score] of [
      ['qwerty12345', 'Fraca', '1'],
      ['qz7!M2pa', 'Razoável', '2'],
      ['BlueRiver2026', 'Forte', '3'],
    ]) {
      await wrapper.setProps({ password })
      expect(wrapper.text()).toContain(label)
      expect(meter.attributes('aria-valuenow')).toBe(score)
    }

    await wrapper.setProps({ password: 'correct horse battery staple' })
    expect(wrapper.text()).toContain('Muito forte')
    expect(meter.attributes('aria-valuenow')).toBe('4')
  })
})
