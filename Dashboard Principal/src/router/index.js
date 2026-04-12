import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import AuthorDashboard from '@/views/AuthorDashboard.vue'
import ReviewerDashboard from '@/views/ReviewerDashboard.vue'
import SectionEditorDashboard from '@/views/SectionEditorDashboard.vue'
import ChiefEditorDashboard from '@/views/ChiefEditorDashboard.vue'
import AdminDashboard from '@/views/AdminDashboard.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
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

export default router
