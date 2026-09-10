import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ArchivedCategoriesView from '../ArchivedCategoriesView.vue'

vi.mock('@/stores/categories/categoryStore', () => ({
  useCategoryStore: () => ({
    archivedCategories: [],
    loading: false,
    lifecycleLoading: false,
    error: null,
    fetchCategories: vi.fn().mockResolvedValue(),
    restore: vi.fn(),
  }),
}))
describe('ArchivedCategoriesView', () => {
  it('renders archived category management', () => {
    const wrapper = mount(ArchivedCategoriesView, {
      global: {
        stubs: {
          PageHeader: { props: ['title'], template: '<header>{{ title }}</header>' },
          CategoryList: true,
          CategoryLifecycleDialog: true,
          ElAlert: true,
        },
      },
    })
    expect(wrapper.text()).toContain('Archived categories')
  })
})
