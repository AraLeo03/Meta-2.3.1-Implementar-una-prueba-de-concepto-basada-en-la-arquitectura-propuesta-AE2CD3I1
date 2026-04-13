<template>
  <div class="app">
    <header v-if="authStore.isAuthenticated" class="header">
      <div class="header-content">
        <router-link to="/" class="logo">PeerReview AI</router-link>
        <div class="header-actions">
          <span class="user-name" @click="showProfileMenu = !showProfileMenu" style="cursor: pointer;">
            {{ authStore.user?.nombres }} {{ authStore.user?.apellidoPaterno }}
          </span>
          <div class="user-avatar" @click="showProfileMenu = !showProfileMenu" style="cursor: pointer;">
            {{ authStore.userInitials }}
          </div>
        </div>
        <Transition name="fade">
          <div v-if="showProfileMenu" class="profile-menu" @click.self="showProfileMenu = false">
            <div class="profile-info">
              <div class="profile-avatar">{{ authStore.userInitials }}</div>
              <div class="profile-details">
                <div class="profile-name">{{ authStore.user?.nombres }} {{ authStore.user?.apellidoPaterno }} {{ authStore.user?.apellidoMaterno }}</div>
                <div class="profile-email">{{ authStore.user?.email }}</div>
              </div>
            </div>
            <div class="profile-data">
              <div class="data-row">
                <span class="data-label">Rol:</span>
                <span class="data-value">{{ getRoleName(authStore.user?.rol) }}</span>
              </div>
              <div class="data-row">
                <span class="data-label">Organización:</span>
                <span class="data-value">{{ authStore.user?.organizacion }}</span>
              </div>
            </div>
            <button class="btn-logout" @click="handleLogout">Cerrar Sesión</button>
          </div>
        </Transition>
      </div>
    </header>
    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ToastContainer from '@/shared/components/ToastContainer.vue'
import { useAuthStore } from '@/shared/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()
const showProfileMenu = ref(false)

const roleNames = {
  autor: 'Autor',
  revisor: 'Revisor',
  editor_seccion: 'Editor de Sección',
  editor_jefe: 'Editor Jefe',
  admin: 'Administrador'
}

function getRoleName(rol) {
  return roleNames[rol] || rol
}

onMounted(async () => {
  if (authStore.token) {
    await authStore.checkAuth()
  }
})

function handleLogout() {
  showProfileMenu.value = false
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app { min-height: 100vh; display: flex; flex-direction: column; }
.header { background: var(--white); border-bottom: 1px solid var(--border); padding: 16px 24px; position: sticky; top: 0; z-index: 100; }
.header-content { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; position: relative; }
.logo { font-size: 20px; font-weight: 700; color: var(--blue); text-decoration: none; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.user-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--blue); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; }
.user-name { font-weight: 500; font-size: 14px; }
.profile-menu { position: absolute; top: 100%; right: 0; margin-top: 8px; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; width: 280px; box-shadow: var(--shadow); z-index: 200; }
.profile-info { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border); margin-bottom: 12px; }
.profile-avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--blue); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 18px; }
.profile-details { flex: 1; min-width: 0; }
.profile-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile-email { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile-data { margin-bottom: 12px; }
.data-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; }
.data-label { color: var(--muted); }
.data-value { font-weight: 500; text-align: right; max-width: 60%; overflow: hidden; text-overflow: ellipsis; }
.btn-logout { width: 100%; background: none; border: 1px solid var(--border); padding: 8px 12px; border-radius: 6px; font-size: 13px; color: var(--muted); cursor: pointer; transition: all .15s; margin-top: 8px; }
.btn-logout:hover { background: var(--red-soft); color: var(--red); border-color: var(--red); }
.main { max-width: 1200px; margin: 0 auto; padding: 32px 24px; flex: 1; width: 100%; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
