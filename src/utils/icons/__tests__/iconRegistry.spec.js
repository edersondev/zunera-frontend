import { describe, expect, it } from 'vitest'
import { messages } from '@/i18n/messages'
import { ICON_COMPONENTS, ICON_CONTEXTS, iconComponent, iconOptions } from '../iconRegistry'

describe('icon registry', () => {
  it('keeps every stored legacy value and provides a visual and both translations', () => {
    const legacy = {
      financialAccounts: ['bank', 'piggy_bank', 'wallet', 'chart', 'smartphone', 'circle'],
      categories: [
        'home',
        'utensils',
        'car',
        'heart',
        'book',
        'gamepad',
        'shopping_bag',
        'receipt',
        'landmark',
        'circle',
        'wallet',
        'briefcase',
        'chart',
        'gift',
        'refund',
      ],
      creditCards: ['credit_card', 'bank', 'wallet', 'smartphone', 'circle'],
    }
    for (const [context, values] of Object.entries(legacy)) {
      for (const value of values) expect(ICON_CONTEXTS[context]).toContain(value)
    }
    for (const [context, values] of Object.entries(ICON_CONTEXTS)) {
      for (const value of values) {
        expect(ICON_COMPONENTS[value]).toBeTruthy()
        expect(messages.en[context].icons[value]).toBeTruthy()
        expect(messages['pt-BR'][context].icons[value]).toBeTruthy()
      }
      expect(iconOptions(context, (key) => key)).toHaveLength(values.length)
    }
  })

  it('uses a neutral preview for an unknown historic value', () => {
    expect(iconComponent('unknown')).toBe(ICON_COMPONENTS.circle)
  })
})
