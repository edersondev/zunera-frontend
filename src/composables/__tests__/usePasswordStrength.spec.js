import { describe, expect, it } from 'vitest'
import { evaluatePasswordStrength } from '../usePasswordStrength.js'

describe('password strength analysis', () => {
  it('does not score an empty password', () => {
    expect(evaluatePasswordStrength('')).toBeNull()
  })

  it('scores common and predictable passwords below the allowed threshold', () => {
    expect(evaluatePasswordStrength('password')).toBe(0)
    expect(evaluatePasswordStrength('qwerty12345')).toBeLessThan(3)
    expect(evaluatePasswordStrength('password123456')).toBeLessThan(3)
  })

  it('scores strong passphrases and high-entropy passwords at least three', () => {
    expect(evaluatePasswordStrength('correct horse battery staple')).toBeGreaterThanOrEqual(3)
    expect(evaluatePasswordStrength('Z!7pQ#9rT@4v')).toBe(4)
  })

  it('penalizes passwords based on registration information', () => {
    const password = 'AnaSilverCloud!2026'
    expect(evaluatePasswordStrength(password, ['Ana', 'SilverCloud'])).toBeLessThan(
      evaluatePasswordStrength(password),
    )
  })
})
