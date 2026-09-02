import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './authGuard'
import AppShell from '@/layouts/AppShell.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'sign-in' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: { guestOnly: true, title: 'Create account' },
    },
    {
      path: '/login',
      name: 'sign-in',
      component: () => import('@/views/auth/SignInView.vue'),
      meta: { guestOnly: true, title: 'Sign in' },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/auth/ForgotPasswordView.vue'),
      meta: { guestOnly: true, title: 'Recover password' },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/auth/ResetPasswordView.vue'),
      meta: { guestOnly: true, title: 'Reset password' },
    },
    {
      path: '/app',
      component: AppShell,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'protected-home',
          component: () => import('@/views/ProtectedHomeView.vue'),
          meta: { requiresAuth: true, title: 'Zunera account' },
        },
        {
          path: 'financial-accounts',
          name: 'financial-accounts',
          component: () => import('@/views/financial-accounts/FinancialAccountsListView.vue'),
          meta: { requiresAuth: true, title: 'Financial accounts' },
        },
        {
          path: 'financial-accounts/archived',
          name: 'financial-accounts-archived',
          component: () => import('@/views/financial-accounts/ArchivedFinancialAccountsView.vue'),
          meta: { requiresAuth: true, title: 'Archived accounts' },
        },
        {
          path: 'financial-accounts/:id',
          name: 'financial-account-detail',
          component: () => import('@/views/financial-accounts/FinancialAccountDetailView.vue'),
          meta: { requiresAuth: true, title: 'Account details' },
        },
      ],
    },
  ],
})

router.beforeEach(authGuard)

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | Zunera` : 'Zunera'

  queueMicrotask(() => {
    document.getElementById('main-content')?.focus()
  })
})

export default router
