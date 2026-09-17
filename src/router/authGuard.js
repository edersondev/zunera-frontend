import { useSessionStore } from '@/stores/auth/sessionStore'

export async function authGuard(to) {
  const sessionStore = useSessionStore()

  await sessionStore.bootstrap()

  if (to.meta.requiresAuth && !sessionStore.isAuthenticated) {
    return {
      name: 'sign-in',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && sessionStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
}
