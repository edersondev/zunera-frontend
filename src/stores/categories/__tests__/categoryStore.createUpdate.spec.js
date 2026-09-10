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

describe('categoryStore create and update', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })
  it('reconciles create/update and exposes conflict feedback', async () => {
    const store = useCategoryStore()
    service.createCategory.mockResolvedValue({ id: 1, name: 'Pet care' })
    await store.create({ name: 'Pet care' })
    service.updateCategory.mockResolvedValue({ id: 1, name: 'Pet health' })
    await store.update(1, { name: 'Pet health' })
    expect(store.categories).toEqual([{ id: 1, name: 'Pet health' }])
    const conflict = Object.assign(new Error('Duplicate.'), {
      code: 'category_name_conflict',
      errors: {},
    })
    service.createCategory.mockRejectedValue(conflict)
    await expect(store.create({ name: 'Pet health' })).rejects.toBe(conflict)
    expect(store.error.code).toBe('category_name_conflict')
  })
})
