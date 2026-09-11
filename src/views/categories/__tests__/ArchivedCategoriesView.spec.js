import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ArchivedCategoriesView from '../ArchivedCategoriesView.vue'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))
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
  it('renders archived category management and active category navigation', async () => {
    const wrapper = mount(ArchivedCategoriesView, {
      global: {
        stubs: {
          PageHeader: {
            props: ['title'],
            template: '<header>{{ title }}<slot name="actions" /></header>',
          },
          CategoryList: true,
          CategoryLifecycleDialog: true,
          ElAlert: true,
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })
    expect(wrapper.text()).toContain('Categorias arquivadas')
    expect(wrapper.text()).toContain('Categorias')

    await wrapper.find('[data-test="open-categories"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({ name: 'categories' })
  })
})
