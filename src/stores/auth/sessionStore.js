import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  continueSession as continueSessionRequest,
  getSession,
  registerAccount,
  requestPasswordRecovery,
  resetPassword,
  signIn,
  signOut,
} from '@/services/authService'

export const useSessionStore = defineStore('auth.session', () => {
  const user = shallowRef(null)
  const session = shallowRef(null)
  const bootstrapped = shallowRef(false)
  const loading = shallowRef(false)
  const error = shallowRef(null)

  const isAuthenticated = computed(() => Boolean(user.value))

  function applySession(payload) {
    user.value = payload.user
    session.value = payload.session
    error.value = null
  }

  function clearSession() {
    user.value = null
    session.value = null
  }

  async function bootstrap() {
    if (bootstrapped.value) {
      return
    }

    loading.value = true

    try {
      applySession(await getSession())
    } catch {
      clearSession()
    } finally {
      bootstrapped.value = true
      loading.value = false
    }
  }

  async function register(payload) {
    loading.value = true
    error.value = null

    try {
      applySession(await registerAccount(payload))
    } catch (requestError) {
      error.value = requestError
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function login(payload) {
    loading.value = true
    error.value = null

    try {
      applySession(await signIn(payload))
    } catch (requestError) {
      error.value = requestError
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true

    try {
      await signOut()
    } finally {
      clearSession()
      loading.value = false
    }
  }

  async function continueCurrentSession() {
    const nextSession = await continueSessionRequest()
    session.value = nextSession
  }

  return {
    user,
    session,
    bootstrapped,
    loading,
    error,
    isAuthenticated,
    bootstrap,
    register,
    login,
    logout,
    continueCurrentSession,
    requestPasswordRecovery,
    resetPassword,
    clearSession,
  }
})
