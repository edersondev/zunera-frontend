import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({ apiRequest: vi.fn() }))
const { apiRequest } = await import('../httpClient')
const { archiveCategory, createCategory, listCategories, restoreCategory, updateCategory } =
  await import('../categoryService')

describe('categoryService', () => {
  beforeEach(() => apiRequest.mockReset())
  it('uses active and archived list contract parameters', async () => {
    apiRequest.mockResolvedValue({ data: { data: [] } })
    await listCategories()
    await listCategories('archived')
    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      method: 'get',
      url: '/api/v1/categories',
      params: { status: 'active' },
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      method: 'get',
      url: '/api/v1/categories',
      params: { status: 'archived' },
    })
  })
  it('protects category mutations with CSRF', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 1 } } })
    await createCategory({ name: 'Pet care' })
    await updateCategory(1, { name: 'Pet health' })
    await archiveCategory(1)
    await restoreCategory(1)
    expect(apiRequest).toHaveBeenCalledWith(
      { method: 'post', url: '/api/v1/categories', data: { name: 'Pet care' } },
      { csrf: true },
    )
    expect(apiRequest).toHaveBeenCalledWith(
      { method: 'post', url: '/api/v1/categories/1/archive' },
      { csrf: true },
    )
    expect(apiRequest).toHaveBeenCalledWith(
      { method: 'post', url: '/api/v1/categories/1/restore' },
      { csrf: true },
    )
  })
})
