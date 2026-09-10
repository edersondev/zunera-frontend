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

describe('categoryStore lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })
  it('moves categories between active and archived collections', async () => {
    const active = { id: 1, status: 'active' }
    const archived = { ...active, status: 'archived' }
    const store = useCategoryStore()
    store.categories = [active]
    service.archiveCategory.mockResolvedValue(archived)
    await store.archive(active)
    expect(store.archivedCategories).toEqual([archived])
    service.restoreCategory.mockResolvedValue(active)
    await store.restore(archived)
    expect(store.categories).toEqual([active])
  })
})
