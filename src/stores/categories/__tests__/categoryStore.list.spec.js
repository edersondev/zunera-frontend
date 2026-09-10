import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/categoryService', () => ({
  listCategories: vi.fn(),
  getCategory: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  archiveCategory: vi.fn(),
  restoreCategory: vi.fn(),
}))
const service = await import('@/services/categoryService')
const { useCategoryStore } = await import('../categoryStore')

describe('categoryStore list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })
  it('keeps active and archived collections separate', async () => {
    service.listCategories
      .mockResolvedValueOnce([{ id: 1, status: 'active' }])
      .mockResolvedValueOnce([{ id: 2, status: 'archived' }])
    const store = useCategoryStore()
    await store.fetchCategories()
    await store.fetchCategories('archived')
    expect(store.categories).toEqual([{ id: 1, status: 'active' }])
    expect(store.archivedCategories).toEqual([{ id: 2, status: 'archived' }])
  })
})
