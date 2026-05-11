import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import AuthorDashboard from '@/views/AuthorDashboard.vue'
import ReviewerDashboard from '@/views/ReviewerDashboard.vue'
import SectionEditorDashboard from '@/views/SectionEditorDashboard.vue'
import ChiefEditorDashboard from '@/views/ChiefEditorDashboard.vue'
import AdminDashboard from '@/views/AdminDashboard.vue'
import LoginView from '@/views/LoginView.vue'
import { useAuthStore } from '@/shared/stores/authStore'

// ── Mapa ruta → rol requerido ─────────────────────────────────────────────────
// Con multi-rol, una ruta requiere que el usuario tenga ESE rol entre sus roles
// (no necesariamente que sea su único rol).
const ROUTE_ROLE = {
  '/autor': 'autor',
  '/revisor': 'revisor',
  '/editor-seccion': 'editor_seccion',
  '/editor-jefe': 'editor_jefe',
  '/admin': 'admin'
}

const DASHBOARD_PATHS = Object.keys(ROUTE_ROLE)

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/autor', name: 'autor', component: AuthorDashboard },
  { path: '/revisor', name: 'revisor', component: ReviewerDashboard },
  { path: '/editor-seccion', name: 'section-editor', component: SectionEditorDashboard },
  { path: '/editor-jefe', name: 'chief-editor', component: ChiefEditorDashboard },
  { path: '/admin', name: 'admin', component: AdminDashboard }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// ── Guard 1: hidrata el usuario si ya hay token pero aún no está en memoria ──
router.beforeResolve(async (to) => {
  const authStore = useAuthStore()
  if (authStore.token && !authStore.user) {
    await authStore.checkAuth()
  }
})

// ── Guard 2: control de acceso ────────────────────────────────────────────────
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // — Si hay token pero el usuario no está hidratado, intenta recuperarlo
  if (!authStore.isAuthenticated && authStore.token) {
    const ok = await authStore.checkAuth()
    if (!ok) {
      next('/login')
      return
    }
  }

  // — Ruta de login: si ya está autenticado, redirige a su dashboard principal
  if (to.path === '/login') {
    if (authStore.isAuthenticated) {
      next(authStore.getRoleRoute())
    } else {
      next()
    }
    return
  }

  // — Rutas protegidas: requieren autenticación
  if (!authStore.isAuthenticated) {
    next('/login')
    return
  }

  // — Raíz: redirige al dashboard principal del usuario
  if (to.path === '/') {
    next(authStore.getRoleRoute())
    return
  }

  // — Dashboards: verifica que el usuario tenga el rol necesario para esa ruta
  //   Con multi-rol un autor-revisor puede entrar a /autor Y a /revisor.
  if (DASHBOARD_PATHS.includes(to.path)) {
    const requiredRole = ROUTE_ROLE[to.path]
    if (!authStore.hasRole(requiredRole)) {
      // No tiene el rol: lo manda a su dashboard principal
      next(authStore.getRoleRoute())
      return
    }
  }

  next()
})

export default router
