import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  archiveAccountData,
  deleteAccountData,
  listAccountDataArchives,
  listAccountDataArchiveRecords,
} from '../accountDataService'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))
vi.mock('../httpClient', () => ({ apiRequest }))

beforeEach(() => apiRequest.mockReset())

describe('account data API', () => {
  it('sends archive and delete through CSRF-aware requests', async () => {
    apiRequest.mockResolvedValueOnce({ data: { data: { id: 4 } } })
    apiRequest.mockResolvedValueOnce({ data: null })

    expect(await archiveAccountData()).toEqual({ id: 4 })
    await deleteAccountData('current secret')

    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      method: 'post', url: '/api/v1/account-data/archive', data: {},
    }, { csrf: true })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      method: 'delete', url: '/api/v1/account-data', data: { current_password: 'current secret' },
    }, { csrf: true })
  })

  it('scopes read requests to an archive and page', async () => {
    apiRequest.mockResolvedValueOnce({ data: { data: [{ id: 4 }] } })
    apiRequest.mockResolvedValueOnce({ data: { data: [{ source_id: 8 }], meta: { total: 1 } } })

    expect(await listAccountDataArchives()).toEqual([{ id: 4 }])
    expect(await listAccountDataArchiveRecords(4, 'transactions', 2)).toEqual({
      data: [{ source_id: 8 }], meta: { total: 1 },
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      method: 'get', url: '/api/v1/account-data/archives/4/records',
      params: { type: 'transactions', page: 2 },
    })
  })
})
