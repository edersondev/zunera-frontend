import { beforeEach, describe, expect, it, vi } from 'vitest'

const elMessage = vi.hoisted(() => vi.fn())
vi.mock('element-plus', () => ({ ElMessage: elMessage }))

import { showActionSuccess } from '../actionMessage'

describe('action messages', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a brief, closable success message and groups repeated results', () => {
    showActionSuccess('Saved.')

    expect(elMessage).toHaveBeenCalledWith({
      message: 'Saved.',
      type: 'success',
      duration: 3000,
      showClose: true,
      grouping: true,
    })
  })
})
