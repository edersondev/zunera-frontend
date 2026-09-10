import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoriesListView from '../CategoriesListView.vue'

vi.mock('@/stores/categories/categoryStore', () => ({
  useCategoryStore: () => ({
    categories: [],
    loading: false,
    creating: false,
    updating: false,
    lifecycleLoading: false,
    error: null,
    fetchCategories: vi.fn().mockResolvedValue(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  }),
}))
describe('CategoriesListView', () => {
  it('renders the active category heading and creation action', () => {
    const wrapper = mount(CategoriesListView, {
      global: {
        stubs: {
          PageHeader: { template: '<header><slot /><slot name="actions" /></header>' },
          CategoryList: true,
          CategoryForm: true,
          CategoryLifecycleDialog: true,
          ElButton: { template: '<button><slot /></button>' },
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElAlert: true,
        },
      },
    })
    expect(wrapper.text()).toContain('New category')
  })
})
