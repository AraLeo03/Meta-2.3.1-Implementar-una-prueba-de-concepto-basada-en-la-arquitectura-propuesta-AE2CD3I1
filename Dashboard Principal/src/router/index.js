import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import AuthorDashboard from '@/views/AuthorDashboard.vue'
import ReviewerDashboard from '@/views/ReviewerDashboard.vue'
import SectionEditorDashboard from '@/views/SectionEditorDashboard.vue'
import ChiefEditorDashboard from '@/views/ChiefEditorDashboard.vue'
import AdminDashboard from '@/views/AdminDashboard.vue'
import LoginView from '@/views/LoginView.vue'
import { useAuthStore } from '@/shared/stores/authStore'

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

router.beforeResolve(async (to) => {
  const authStore = useAuthStore()
  
  if (authStore.token && !authStore.user) {
    await authStore.checkAuth()
  }
})

const roleRoutes = {
  autor: '/autor',
  revisor: '/revisor',
  editor_seccion: '/editor-seccion',
  editor_jefe: '/editor-jefe',
  admin: '/admin'
}

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  const dashboardRoutes = ['/autor', '/revisor', '/editor-seccion', '/editor-jefe', '/admin']
  const isDashboardRoute = dashboardRoutes.includes(to.path)

  if (to.path === '/login') {
    if (authStore.isAuthenticated) {
      const rolePath = roleRoutes[authStore.user?.rol]
      next(rolePath || '/login')
    } else {
      next()
    }
    return
  }

  if (!authStore.isAuthenticated && authStore.token) {
    const authenticated = await authStore.checkAuth()
    if (!authenticated) {
      next('/login')
      return
    }
  }

  if (!authStore.isAuthenticated) {
    next('/login')
    return
  }

  if (isDashboardRoute) {
    const userRolePath = roleRoutes[authStore.user?.rol]
    if (to.path !== userRolePath) {
      next(userRolePath)
      return
    }
  }

  if (to.path === '/') {
    const rolePath = roleRoutes[authStore.user?.rol]
    next(rolePath || '/login')
    return
  }

  next()
})

export default router
