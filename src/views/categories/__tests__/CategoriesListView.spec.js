import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoriesListView from '../CategoriesListView.vue'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))
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
  it('renders the active category heading and navigation actions', async () => {
    const wrapper = mount(CategoriesListView, {
      global: {
        stubs: {
          PageHeader: { template: '<header><slot /><slot name="actions" /></header>' },
          CategoryList: true,
          CategoryForm: true,
          CategoryLifecycleDialog: true,
          ElButton: {
            props: ['type'],
            template: '<button :data-button-type="type"><slot /></button>',
          },
          ElDialog: {
            props: ['title'],
            template: '<div :data-dialog-title="title"><slot /><slot name="footer" /></div>',
          },
          ElAlert: true,
        },
      },
    })
    expect(wrapper.text()).toContain('New category')
    expect(wrapper.text()).toContain('Archived')
    expect(wrapper.findAll('[data-test]').map((button) => button.attributes('data-test'))).toEqual([
      'open-create-category',
      'open-archived-categories',
      'create-category',
      'save-category',
    ])
    expect(
      wrapper.find('[data-test="open-archived-categories"]').attributes('data-button-type'),
    ).toBe('warning')

    await wrapper.find('[data-test="open-archived-categories"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({ name: 'categories-archived' })
  })

  it('renders category dialog cancel actions as dangerous', () => {
    const wrapper = mount(CategoriesListView, {
      global: {
        stubs: {
          PageHeader: { template: '<header><slot /><slot name="actions" /></header>' },
          CategoryList: true,
          CategoryForm: true,
          CategoryLifecycleDialog: true,
          ElButton: {
            props: ['type'],
            template: '<button :data-button-type="type"><slot /></button>',
          },
          ElDialog: {
            props: ['title'],
            template: '<div :data-dialog-title="title"><slot /><slot name="footer" /></div>',
          },
          ElAlert: true,
        },
      },
    })

    const newCategoryDialog = wrapper.find('[data-dialog-title="New category"]')
    const editCategoryDialog = wrapper.find('[data-dialog-title="Edit category"]')

    expect(newCategoryDialog.find('button').attributes('data-button-type')).toBe('danger')
    expect(editCategoryDialog.find('button').attributes('data-button-type')).toBe('danger')
  })
})
