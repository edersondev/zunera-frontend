import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({
  apiRequest: vi.fn(),
}))

const { apiRequest } = await import('../httpClient')
const {
  archiveFinancialAccount,
  createFinancialAccount,
  getFinancialAccount,
  getFinancialAccountSummary,
  listFinancialAccounts,
  restoreFinancialAccount,
  updateFinancialAccount,
} = await import('../financialAccountService')

describe('financialAccountService', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('lists active and archived accounts with the status parameter', async () => {
    apiRequest.mockResolvedValue({ data: { data: [] } })

    await listFinancialAccounts('active')
    await listFinancialAccounts('archived')

    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      method: 'get',
      url: '/api/v1/financial-accounts',
      params: { status: 'active' },
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      method: 'get',
      url: '/api/v1/financial-accounts',
      params: { status: 'archived' },
    })
  })

  it('reads summary and account detail', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 7 } } })

    await expect(getFinancialAccountSummary()).resolves.toEqual({ id: 7 })
    await expect(getFinancialAccount(7)).resolves.toEqual({ id: 7 })

    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      method: 'get',
      url: '/api/v1/financial-accounts/summary',
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      method: 'get',
      url: '/api/v1/financial-accounts/7',
    })
  })

  it('creates and updates accounts with CSRF protection', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 1 } } })

    await createFinancialAccount({ name: 'Conta' })
    await updateFinancialAccount(1, { name: 'Conta nova' })

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      { method: 'post', url: '/api/v1/financial-accounts', data: { name: 'Conta' } },
      { csrf: true },
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      { method: 'patch', url: '/api/v1/financial-accounts/1', data: { name: 'Conta nova' } },
      { csrf: true },
    )
  })

  it('archives and restores accounts with CSRF protection', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 2 } } })

    await archiveFinancialAccount(2)
    await restoreFinancialAccount(2)

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      { method: 'post', url: '/api/v1/financial-accounts/2/archive' },
      { csrf: true },
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      { method: 'post', url: '/api/v1/financial-accounts/2/restore' },
      { csrf: true },
    )
  })
})
