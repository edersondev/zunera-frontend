import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { messages } from '@/i18n/messages'
import DashboardGoalsCard from '../DashboardGoalsCard.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages })
const global = { plugins: [i18n], stubs: { RouterLink: { props: ['to'], template: '<a><slot /></a>' } } }

describe('DashboardGoalsCard', () => {
  it('shows no fabricated zero during independent loading and offers retry on error', () => {
    const loading = mount(DashboardGoalsCard, { global, props: { goals: null, loading: true } })
    expect(loading.text()).not.toContain('0.00')
    const error = mount(DashboardGoalsCard, { global, props: { goals: null, error: new Error('Unavailable') } })
    expect(error.text()).toContain('Unavailable')
  })
  it('limits visible data to supplied goals and escapes hostile names', () => {
    const wrapper = mount(DashboardGoalsCard, { global, props: { goals: [{ id: 1, name: '<img src=x onerror=alert(1)>', allocated_centavos: 100, target_centavos: 200 }] } })
    expect(wrapper.html()).not.toContain('<img src=x')
    expect(wrapper.text()).toContain('<img src=x')
  })
})
