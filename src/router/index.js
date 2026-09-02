import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './authGuard'

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
      name: 'protected-home',
      component: () => import('@/views/ProtectedHomeView.vue'),
      meta: { requiresAuth: true, title: 'Zunera account' },
    },
  ],
})

router.beforeEach(authGuard)

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | Zunera` : 'Zunera'
})

export default router
