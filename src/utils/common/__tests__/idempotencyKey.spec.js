import { afterEach, describe, expect, it, vi } from 'vitest'
import { newIdempotencyKey } from '../idempotencyKey'

afterEach(() => vi.unstubAllGlobals())

describe('newIdempotencyKey', () => {
  it('generates distinct v4 UUIDs when randomUUID is unavailable over HTTP', () => {
    let call = 0
    const getRandomValues = vi.fn((bytes) => {
      bytes.set(Array.from({ length: 16 }, (_, index) => index + call))
      call += 1
      return bytes
    })
    vi.stubGlobal('crypto', { getRandomValues })

    const first = newIdempotencyKey()
    const second = newIdempotencyKey()

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(second).not.toBe(first)
    expect(getRandomValues).toHaveBeenCalledTimes(2)
  })
})
