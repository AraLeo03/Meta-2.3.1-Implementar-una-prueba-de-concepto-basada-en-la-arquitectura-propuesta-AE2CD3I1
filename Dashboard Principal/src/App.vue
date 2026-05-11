<template>
  <div class="app">
    <header v-if="authStore.isAuthenticated" class="header">
      <div class="header-content">
        <router-link to="/" class="logo">PeerReview AI</router-link>
        <div class="header-actions">
          <span class="user-name" @click="showProfileMenu = !showProfileMenu" style="cursor: pointer;">
            {{ authStore.user?.nombres }} {{ authStore.user?.apellidoPaterno }}
          </span>

          <!-- Campana: visible si el usuario tiene el rol revisor -->
          <div v-if="authStore.hasRole('revisor')" class="notif-bell-wrap" ref="bellRef">
            <button class="notif-bell" @click="toggleBell">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span v-if="notifTotal > 0" class="notif-count">{{ notifTotal > 9 ? '9+' : notifTotal }}</span>
            </button>

            <Transition name="bell-drop">
              <div v-if="showBell" class="notif-dropdown">
                <div class="notif-dropdown-title">Notificaciones</div>
                <div v-if="notifList.length === 0" class="notif-empty">Sin notificaciones nuevas</div>
                <div
                  v-for="n in notifList"
                  :key="n.key"
                  class="notif-row"
                  :class="n.type === 'invitation' ? 'notif-row-inv' : 'notif-row-msg'"
                  @click="showBell = false"
                >
                  <span class="notif-row-icon">{{ n.type === 'invitation' ? '📩' : '💬' }}</span>
                  <div class="notif-row-body">
                    <div class="notif-row-title">{{ n.label }}</div>
                    <div class="notif-row-sub">{{ n.title }}</div>
                  </div>
                  <span v-if="n.count" class="notif-row-badge">{{ n.count }}</span>
                </div>
              </div>
            </Transition>
          </div>

          <div class="user-avatar" @click="showProfileMenu = !showProfileMenu" style="cursor: pointer;">
            {{ authStore.userInitials }}
          </div>
        </div>

        <Transition name="fade">
          <div v-if="showProfileMenu" class="profile-menu" @click.self="showProfileMenu = false">
            <!-- Info del usuario -->
            <div class="profile-info">
              <div class="profile-avatar">{{ authStore.userInitials }}</div>
              <div class="profile-details">
                <div class="profile-name">{{ authStore.user?.nombres }} {{ authStore.user?.apellidoPaterno }} {{ authStore.user?.apellidoMaterno }}</div>
                <div class="profile-email">{{ authStore.user?.email }}</div>
              </div>
            </div>

            <!-- Datos -->
            <div class="profile-data">
              <div class="data-row">
                <span class="data-label">Organización:</span>
                <span class="data-value">{{ authStore.user?.organizacion }}</span>
              </div>
            </div>

            <!-- ── Selector de rol activo (solo si tiene más de un rol) ── -->
            <div v-if="authStore.userRoles.length > 1" class="role-switcher">
              <div class="role-switcher-label">Cambiar vista</div>
              <div class="role-switcher-buttons">
                <button
                  v-for="rol in authStore.userRoles"
                  :key="rol"
                  class="role-btn"
                  :class="{ active: isActiveRoute(rol) }"
                  @click="switchRole(rol)"
                >
                  {{ getRoleName(rol) }}
                </button>
              </div>
            </div>

            <!-- Si solo tiene un rol, mostrarlo como texto simple -->
            <div v-else class="profile-data">
              <div class="data-row">
                <span class="data-label">Rol:</span>
                <span class="data-value">{{ getRoleName(authStore.primaryRole) }}</span>
              </div>
            </div>
            <!-- ─────────────────────────────────────────────────────────── -->

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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import ToastContainer from '@/shared/components/ToastContainer.vue'
import { useAuthStore } from '@/shared/stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const showProfileMenu = ref(false)

// ── Campana de notificaciones ──────────────────────────────────────
const showBell = ref(false)
const bellRef = ref(null)
const notifData = ref({ invitations: [], messages: [], total: 0 })

const notifTotal = computed(() => notifData.value.total ?? 0)

const notifList = computed(() => {
  const list = []
  for (const inv of notifData.value.invitations ?? []) {
    list.push({ key: 'inv-' + inv.manuscriptId, type: 'invitation', label: 'Nueva invitación', title: inv.title })
  }
  for (const msg of notifData.value.messages ?? []) {
    list.push({ key: 'msg-' + msg.manuscriptId, type: 'message', label: `${msg.count} mensaje${msg.count > 1 ? 's' : ''} nuevo${msg.count > 1 ? 's' : ''}`, title: msg.title, count: msg.count })
  }
  return list
})

async function fetchNotifs() {
  if (!authStore.hasRole('revisor') || !authStore.token) return
  try {
    const res = await axios.get('/api/comments/notifications', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    notifData.value = res.data
  } catch (e) { /* silencioso */ }
}

function toggleBell() {
  showBell.value = !showBell.value
}

function handleOutside(e) {
  if (bellRef.value && !bellRef.value.contains(e.target)) {
    showBell.value = false
  }
}

let pollId = null
// ──────────────────────────────────────────────────────────────────

// ── Roles ─────────────────────────────────────────────────────────
const roleNames = {
  autor: 'Autor',
  revisor: 'Revisor',
  editor_seccion: 'Editor de Sección',
  editor_jefe: 'Editor Jefe',
  admin: 'Administrador'
}

const roleRoutes = {
  autor: '/autor',
  revisor: '/revisor',
  editor_seccion: '/editor-seccion',
  editor_jefe: '/editor-jefe',
  admin: '/admin'
}

function getRoleName(rol) {
  return roleNames[rol] || rol
}

/** Devuelve true si la ruta actual corresponde a ese rol */
function isActiveRoute(rol) {
  return route.path === roleRoutes[rol]
}

/** Navega al dashboard del rol seleccionado y cierra el menú */
function switchRole(rol) {
  const target = roleRoutes[rol]
  if (target && route.path !== target) {
    router.push(target)
  }
  showProfileMenu.value = false
}
// ──────────────────────────────────────────────────────────────────

onMounted(async () => {
  if (authStore.token) {
    await authStore.checkAuth()
    await fetchNotifs()
    pollId = setInterval(fetchNotifs, 30000)
  }
  document.addEventListener('click', handleOutside)
})

onUnmounted(() => {
  clearInterval(pollId)
  document.removeEventListener('click', handleOutside)
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
.profile-avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--blue); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 18px; flex-shrink: 0; }
.profile-details { flex: 1; min-width: 0; }
.profile-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile-email { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile-data { margin-bottom: 12px; }
.data-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; }
.data-label { color: var(--muted); }
.data-value { font-weight: 500; text-align: right; max-width: 60%; overflow: hidden; text-overflow: ellipsis; }

/* ── Selector de rol ── */
.role-switcher {
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 12px 0;
  margin-bottom: 12px;
}
.role-switcher-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 8px;
}
.role-switcher-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.role-btn {
  width: 100%;
  text-align: left;
  background: none;
  border: 1.5px solid var(--border);
  border-radius: 7px;
  padding: 7px 10px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.role-btn:hover {
  border-color: var(--blue);
  background: color-mix(in srgb, var(--blue) 6%, transparent);
}
.role-btn.active {
  border-color: var(--blue);
  background: color-mix(in srgb, var(--blue) 12%, transparent);
  color: var(--blue);
  font-weight: 600;
}
/* ───────────────────── */

.btn-logout { width: 100%; background: none; border: 1px solid var(--border); padding: 8px 12px; border-radius: 6px; font-size: 13px; color: var(--muted); cursor: pointer; transition: all .15s; margin-top: 8px; }
.btn-logout:hover { background: var(--red-soft); color: var(--red); border-color: var(--red); }
.main { max-width: 1200px; margin: 0 auto; padding: 32px 24px; flex: 1; width: 100%; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Campana ── */
.notif-bell-wrap { position: relative; }
.notif-bell {
  position: relative;
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--border); background: white;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #6b7280; transition: background .15s;
}
.notif-bell:hover { background: #f3f4f6; color: #111; }
.notif-count {
  position: absolute; top: -4px; right: -4px;
  min-width: 17px; height: 17px;
  background: #ef4444; color: white;
  font-size: 9px; font-weight: 700; border-radius: 100px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 3px; border: 2px solid white;
}
.notif-dropdown {
  position: absolute; top: calc(100% + 8px); right: 0;
  width: 300px; background: white;
  border: 1px solid var(--border); border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.13);
  z-index: 300; overflow: hidden;
}
.notif-dropdown-title {
  padding: 11px 16px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em; color: #374151;
  border-bottom: 1px solid #f3f4f6;
}
.notif-empty { padding: 18px; text-align: center; font-size: 13px; color: #9ca3af; }
.notif-row {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 16px; cursor: pointer;
  border-bottom: 1px solid #f9fafb; transition: background .1s;
}
.notif-row:last-child { border-bottom: none; }
.notif-row:hover { background: #f9fafb; }
.notif-row-inv { border-left: 3px solid #f59e0b; }
.notif-row-msg { border-left: 3px solid #3b82f6; }
.notif-row-icon { font-size: 17px; flex-shrink: 0; }
.notif-row-body { flex: 1; min-width: 0; }
.notif-row-title { font-size: 12px; font-weight: 600; color: #111827; }
.notif-row-sub { font-size: 11px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.notif-row-badge { background: #3b82f6; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 100px; flex-shrink: 0; }
.bell-drop-enter-active, .bell-drop-leave-active { transition: opacity .15s, transform .15s; }
.bell-drop-enter-from, .bell-drop-leave-to { opacity: 0; transform: translateY(-5px); }
</style>