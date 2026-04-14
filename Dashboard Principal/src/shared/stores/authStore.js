import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_URL = '/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userInitials = computed(() => {
    if (!user.value) return ''
    const names = user.value.nombres.split(' ')
    return names.slice(0, 2).map(n => n[0]).join('').toUpperCase()
  })

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Error al iniciar sesión')
      }
      token.value = data.token
      user.value = data.user
      localStorage.setItem('token', data.token)
      return true
    } catch (err) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(userData) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, message: data.message }
      }
      return { success: true, message: data.message }
    } catch (err) {
      error.value = err.message
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  async function checkAuth() {
    if (!token.value) return false
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token.value}` }
      })
      if (!res.ok) {
        logout()
        return false
      }
      const data = await res.json()
      user.value = data.user
      return true
    } catch {
      logout()
      return false
    }
  }

  function getRoleRoute() {
    const routes = {
      autor: '/autor',
      revisor: '/revisor',
      editor_seccion: '/editor-seccion',
      editor_jefe: '/editor-jefe',
      admin: '/admin'
    }
    return routes[user.value?.rol] || '/'
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return { 
    user, 
    token, 
    loading, 
    error, 
    isAuthenticated, 
    userInitials,
    login, 
    register, 
    checkAuth, 
    getRoleRoute,
    logout 
  }
})
