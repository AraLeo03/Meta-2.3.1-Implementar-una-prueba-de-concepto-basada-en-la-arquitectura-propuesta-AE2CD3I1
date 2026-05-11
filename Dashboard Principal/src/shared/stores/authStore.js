import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_URL = '/api'

// Orden de prioridad para determinar el dashboard principal
// cuando un usuario tiene varios roles
const ROLE_PRIORITY = ['admin', 'editor_jefe', 'editor_seccion', 'revisor', 'autor']

const ROLE_ROUTES = {
  autor: '/autor',
  revisor: '/revisor',
  editor_seccion: '/editor-seccion',
  editor_jefe: '/editor-jefe',
  admin: '/admin'
}

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

  // ── Helpers de roles ────────────────────────────────────────────────────────

  /**
   * Devuelve el array de roles del usuario actual.
   * Compatible con la respuesta antigua ({ rol: 'autor' }) y la nueva
   * ({ roles: ['autor', 'revisor'] }).
   */
  const userRoles = computed(() => {
    if (!user.value) return []
    if (Array.isArray(user.value.roles)) return user.value.roles
    if (typeof user.value.rol === 'string') return [user.value.rol]
    return []
  })

  /**
   * Devuelve true si el usuario tiene el rol indicado.
   * Uso: hasRole('revisor')
   */
  function hasRole(rol) {
    return userRoles.value.includes(rol)
  }

  /**
   * Devuelve el rol de mayor prioridad del usuario.
   * Se usa para decidir el dashboard por defecto al hacer login.
   */
  const primaryRole = computed(() => {
    return ROLE_PRIORITY.find(r => userRoles.value.includes(r)) || userRoles.value[0] || null
  })

  /**
   * Ruta del dashboard principal (basada en el rol de mayor prioridad).
   */
  function getRoleRoute() {
    return ROLE_ROUTES[primaryRole.value] || '/'
  }

  /**
   * Lista de rutas de dashboard a las que el usuario tiene acceso.
   * Un usuario con ['autor', 'revisor'] puede entrar a /autor y /revisor.
   */
  const accessibleRoutes = computed(() => {
    return userRoles.value.map(r => ROLE_ROUTES[r]).filter(Boolean)
  })

  // ── Acciones ────────────────────────────────────────────────────────────────

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
      // Normaliza: si viene `rol` (string) lo convierte a `roles` (array)
      const payload = { ...userData }
      if (typeof payload.rol === 'string' && !payload.roles) {
        payload.roles = [payload.rol]
        delete payload.rol
      }

      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    // Computed
    isAuthenticated,
    userInitials,
    userRoles,
    primaryRole,
    accessibleRoutes,
    // Actions
    login,
    register,
    checkAuth,
    logout,
    // Helpers
    hasRole,
    getRoleRoute
  }
})
