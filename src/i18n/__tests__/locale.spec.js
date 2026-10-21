import { afterEach, describe, expect, it } from 'vitest'
import { getStoredLocale, persistLocale } from '../locale'
import { i18n } from '..'
import { messages } from '../messages'

describe('locale bootstrap', () => {
  afterEach(() => window.localStorage.clear())

  it('defaults to PT-BR and falls back to English', () => {
    expect(getStoredLocale()).toBe('pt-BR')
    expect(i18n.global.fallbackLocale.value).toBe('en')
  })

  it('restores a supported locale selection', () => {
    persistLocale('en')
    expect(getStoredLocale()).toBe('en')
  })

  it('has complete pt-BR and English purchase-management labels', () => {
    const keys = {
      statementChoice: ['label', 'required', 'more', 'empty', 'loading', 'stale'],
      move: ['title', 'fullSchedule', 'oneInstallment', 'preview', 'stale', 'history'],
      delete: ['title', 'warning', 'linkedCredits', 'confirm'],
    }
    for (const locale of ['pt-BR', 'en']) {
      for (const [group, labels] of Object.entries(keys)) {
        for (const label of labels) expect(messages[locale].creditCards[group][label]).toBeTruthy()
      }
      expect(messages[locale].creditCards.correction.movedConflict).toBeTruthy()
    }
  })
})
