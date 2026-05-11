<template>
  <div class="rev-wrap">

    <!-- TOPBAR -->
    <div class="rev-topbar">
      <div class="brand">Dashboard del revisor</div>

      <!-- Campana de notificaciones -->
      <div class="notif-wrapper" ref="notifWrapperRef">
        <button class="notif-btn" @click="toggleNotifPanel" :class="{ active: showNotifPanel }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span v-if="notifCount > 0" class="notif-dot">{{ notifCount > 9 ? '9+' : notifCount }}</span>
        </button>

        <Transition name="notif-drop">
          <div v-if="showNotifPanel" class="notif-panel">
            <div class="notif-panel-header">Notificaciones</div>

            <div v-if="notifications.invitations.length === 0 && notifications.messages.length === 0" class="notif-empty">
              Sin notificaciones nuevas
            </div>

            <div
              v-for="inv in notifications.invitations"
              :key="'inv-' + inv.manuscriptId"
              class="notif-item notif-inv"
              @click="goToInvitations"
            >
              <div class="notif-icon">📩</div>
              <div class="notif-body">
                <div class="notif-title">Nueva invitación</div>
                <div class="notif-sub">{{ inv.title }}</div>
              </div>
            </div>

            <div
              v-for="msg in notifications.messages"
              :key="'msg-' + msg.manuscriptId"
              class="notif-item notif-msg"
              @click="openChatFromNotif(msg)"
            >
              <div class="notif-icon">💬</div>
              <div class="notif-body">
                <div class="notif-title">{{ msg.count }} mensaje{{ msg.count > 1 ? 's' : '' }} nuevo{{ msg.count > 1 ? 's' : '' }}</div>
                <div class="notif-sub">{{ msg.title }}</div>
              </div>
              <span class="notif-badge">{{ msg.count }}</span>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- INVITACIONES -->
    <div class="rev-section" ref="invitationsSectionRef">
      <div class="rev-section-label">
        Invitaciones pendientes
        <span v-if="invitations.length > 0" class="count-badge orange">{{ invitations.length }}</span>
      </div>
      <div v-if="invitations.length === 0" class="rev-empty">
        <span class="rev-empty-text">Sin invitaciones pendientes</span>
      </div>
      <div v-else>
        <InvitationCard
          v-for="inv in invitations"
          :key="inv.id"
          :invitation="inv"
          @accept="acceptInvitation"
          @decline="declineInvitation"
          @view="viewPDF(inv.id)"
        />
      </div>
    </div>

    <!-- REVISIONES EN CURSO -->
    <div class="rev-section">
      <div class="rev-section-label">
        Revisiones en curso
        <span v-if="activeReviews.length > 0" class="count-badge blue">{{ activeReviews.length }}</span>
      </div>
      <div v-if="activeReviews.length === 0" class="rev-empty">
        <span class="rev-empty-text">No tienes revisiones en curso</span>
      </div>
      <div v-else class="table-box">
        <div class="table-head">
          <span class="col-title">Artículo</span>
          <span class="col-deadline">Plazo</span>
          <span class="col-actions">Acciones</span>
        </div>
        <div
          v-for="rev in activeReviews"
          :key="rev.id"
          class="table-row"
          :class="{ 'row-urgent': rev.daysLeft < 3 }"
        >
          <div class="col-title">
            <div class="rev-title">{{ rev.title }}</div>
            <div class="rev-area">{{ rev.area }}</div>
          </div>
          <div class="col-deadline"><DeadlineBar :days-left="rev.daysLeft" /></div>
          <div class="col-actions">
            <button @click="viewPDF(rev.id)" class="btn-action" title="Ver PDF">Ver PDF</button>
            <button class="btn-chat" @click="openChat(rev)" title="Ver conversación">
              💬
              <span v-if="unreadForManuscript(rev.id) > 0" class="chat-unread-dot">{{ unreadForManuscript(rev.id) }}</span>
            </button>
            <button class="btn-review" @click="openModal(rev)">Revisar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- REVISIONES COMPLETADAS -->
    <div class="rev-section">
      <div class="rev-section-label">
        Revisiones completadas
        <span v-if="completedReviews.length > 0" class="count-badge green">{{ completedReviews.length }}</span>
      </div>
      <div v-if="completedReviews.length === 0" class="rev-empty">
        <span class="rev-empty-text">Aún no has completado ninguna revisión</span>
      </div>
      <div v-else class="table-box">
        <div v-for="rev in completedReviews" :key="rev.id" class="table-row completed-row">
          <div class="col-title">
            <div class="rev-title">{{ rev.title }}</div>
            <div class="rev-area">{{ rev.area }} · {{ new Date(rev.completedAt).toLocaleDateString() }}</div>
          </div>
          <div class="completed-actions">
            <span class="verdict-badge" :class="verdictClass(rev.verdict)">{{ rev.verdict }}</span>
            <button class="btn-chat-sm" @click="openChat(rev)" title="Ver conversación">💬</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: CONVERSACIÓN -->
    <div v-if="showChatModal" class="modal-overlay" @click.self="showChatModal = false">
      <div class="modal-chat">
        <div class="chat-modal-header">
          <div class="chat-modal-info">
            <h3>Conversación</h3>
            <p>{{ chatRev?.title }}</p>
          </div>
          <button class="close-x" @click="showChatModal = false">&times;</button>
        </div>
        <div class="chat-body">
          <CommentPanel v-if="chatRev?.id" :manuscriptId="String(chatRev.id)" />
        </div>
      </div>
    </div>

    <!-- MODAL: ENVIAR REVISIÓN (solo veredicto) -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h3>Enviar revisión</h3>
            <p class="modal-subtitle">{{ selectedRev?.title }}</p>
          </div>
          <button class="close-x" @click="showModal = false">&times;</button>
        </div>

        <div class="form-group">
          <label>Veredicto final</label>
          <select v-model="form.verdict" class="m-select">
            <option value="">Selecciona una opción...</option>
            <option value="Aceptar">Aceptar</option>
            <option value="Revisiones menores">Revisiones menores</option>
            <option value="Revisiones mayores">Revisiones mayores</option>
            <option value="Rechazar">Rechazar</option>
          </select>
        </div>

        <div class="modal-footer">
          <button class="btn-sec" @click="showModal = false">Cancelar</button>
          <button class="btn-pri" :disabled="!form.verdict || processing" @click="submitReview">
            {{ processing ? 'Enviando...' : 'Confirmar veredicto' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useAppStore } from '@/shared/stores/appStore'
import { useAuthStore } from '@/shared/stores/authStore'
import InvitationCard from '@/shared/components/InvitationCard.vue'
import DeadlineBar from '@/shared/components/DeadlineBar.vue'
import CommentPanel from '@/shared/components/CommentPanel.vue'

const store = useAppStore()
const authStore = useAuthStore()
const API_URL = '/api'

const invitations = ref([])
const activeReviews = ref([])
const completedReviews = ref([])

// Notificaciones
const notifications = ref({ invitations: [], messages: [], total: 0 })
const showNotifPanel = ref(false)
const notifWrapperRef = ref(null)
const invitationsSectionRef = ref(null)
const notifCount = computed(() => notifications.value.total)

// Modal veredicto
const showModal = ref(false)
const processing = ref(false)
const selectedRev = ref(null)
const form = ref({ verdict: '' })

// Modal chat (separado del de veredicto)
const showChatModal = ref(false)
const chatRev = ref(null)

let pollInterval = null

onMounted(async () => {
  await fetchMyReviews()
  await fetchNotifications()
  pollInterval = setInterval(fetchNotifications, 30000)
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  clearInterval(pollInterval)
  document.removeEventListener('click', handleOutsideClick)
})

function handleOutsideClick(e) {
  if (notifWrapperRef.value && !notifWrapperRef.value.contains(e.target)) {
    showNotifPanel.value = false
  }
}

function toggleNotifPanel() {
  showNotifPanel.value = !showNotifPanel.value
}

function authHeaders() {
  return { Authorization: `Bearer ${authStore.token}` }
}

async function fetchNotifications() {
  try {
    const res = await axios.get(`${API_URL}/comments/notifications`, { headers: authHeaders() })
    notifications.value = res.data
  } catch (e) {
    console.error('Error fetching notifications:', e)
  }
}

async function fetchMyReviews() {
  if (!authStore.user?.id) return
  try {
    const res = await axios.get(`${API_URL}/manuscripts/reviewer/${authStore.user.id}`)
    const data = res.data

    invitations.value = data
      .filter(r => r.status === 'pendiente')
      .map(r => ({ id: r.manuscriptId, title: r.title }))

    activeReviews.value = data
      .filter(r => r.status === 'aceptada')
      .map(r => ({
        id: r.manuscriptId,
        title: r.title,
        area: r.tags?.join(', ') || 'N/A',
        daysLeft: r.deadline
          ? Math.ceil((new Date(r.deadline) - new Date()) / (1000 * 60 * 60 * 24))
          : 0
      }))

    completedReviews.value = data
      .filter(r => r.status === 'completada')
      .map(r => ({
        id: r.manuscriptId,
        title: r.title,
        area: r.tags?.join(', ') || 'N/A',
        verdict: r.verdict,
        completedAt: r.completedAt
      }))
  } catch (err) {
    console.error('Error al cargar revisiones:', err)
  }
}

function unreadForManuscript(manuscriptId) {
  const found = notifications.value.messages?.find(
    m => m.manuscriptId.toString() === manuscriptId.toString()
  )
  return found?.count || 0
}

function viewPDF(id) {
  window.open(`${API_URL}/manuscripts/${id}/view`, '_blank')
}

function openModal(rev) {
  selectedRev.value = rev
  form.value = { verdict: '' }
  showModal.value = true
}

function openChat(rev) {
  chatRev.value = rev
  showChatModal.value = true
  showNotifPanel.value = false
  markRead(rev.id)
}

function openChatFromNotif(msg) {
  showNotifPanel.value = false
  const rev =
    activeReviews.value.find(r => r.id.toString() === msg.manuscriptId.toString()) ||
    completedReviews.value.find(r => r.id.toString() === msg.manuscriptId.toString()) ||
    { id: msg.manuscriptId, title: msg.title }
  openChat(rev)
}

function goToInvitations() {
  showNotifPanel.value = false
  invitationsSectionRef.value?.scrollIntoView({ behavior: 'smooth' })
}

async function markRead(manuscriptId) {
  try {
    await axios.post(
      `${API_URL}/comments/${manuscriptId}/mark-read`,
      {},
      { headers: authHeaders() }
    )
    await fetchNotifications()
  } catch (e) {
    console.error(e)
  }
}

async function submitReview() {
  processing.value = true
  try {
    await axios.post(`${API_URL}/manuscripts/${selectedRev.value.id}/submit-review`, {
      verdict: form.value.verdict,
      reviewerId: authStore.user.id
    })
    store.pushToast('Revisión completada con éxito')
    showModal.value = false
    await fetchMyReviews()
  } catch {
    store.pushToast('Error al enviar la revisión')
  } finally {
    processing.value = false
  }
}

async function acceptInvitation(id) {
  try {
    await axios.post(`${API_URL}/manuscripts/${id}/accept-invitation`)
    store.pushToast('Invitación aceptada')
    await fetchMyReviews()
    await fetchNotifications()
  } catch { store.pushToast('Error al aceptar') }
}

async function declineInvitation(id) {
  try {
    await axios.post(`${API_URL}/manuscripts/${id}/decline-invitation`)
    store.pushToast('Invitación declinada')
    await fetchMyReviews()
    await fetchNotifications()
  } catch { store.pushToast('Error al declinar') }
}

function verdictClass(verdict) {
  return {
    'Aceptar': 'v-accept',
    'Revisiones menores': 'v-minor',
    'Revisiones mayores': 'v-major',
    'Rechazar': 'v-reject'
  }[verdict] ?? ''
}
</script>

<style scoped>
.rev-wrap { max-width: 720px; margin: 0 auto; padding-top: 40px; }

/* ── TOPBAR ── */
.rev-topbar {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}
.brand { font-size: 18px; font-weight: 600; }

/* ── CAMPANA ── */
.notif-wrapper { position: relative; }

.notif-btn {
  position: relative;
  width: 38px; height: 38px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  background: white;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #6b7280;
  transition: background .15s, border-color .15s;
}
.notif-btn:hover, .notif-btn.active {
  background: #f3f4f6; color: #111; border-color: #d1d5db;
}

.notif-dot {
  position: absolute; top: -5px; right: -5px;
  min-width: 18px; height: 18px;
  background: #ef4444; color: white;
  font-size: 10px; font-weight: 700;
  border-radius: 100px; padding: 0 4px;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid white;
}

/* ── PANEL NOTIF ── */
.notif-panel {
  position: absolute; top: calc(100% + 8px); right: 0;
  width: 310px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.13);
  z-index: 500; overflow: hidden;
}

.notif-panel-header {
  padding: 12px 16px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}
.notif-empty { padding: 20px; text-align: center; font-size: 13px; color: #9ca3af; }

.notif-item {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f9fafb;
  transition: background .1s;
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: #f9fafb; }
.notif-inv { border-left: 3px solid #f59e0b; }
.notif-msg { border-left: 3px solid #3b82f6; }

.notif-icon { font-size: 18px; flex-shrink: 0; }
.notif-body { flex: 1; min-width: 0; }
.notif-title { font-size: 12px; font-weight: 600; color: #111827; }
.notif-sub {
  font-size: 11px; color: #6b7280;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.notif-badge {
  background: #3b82f6; color: white;
  font-size: 10px; font-weight: 700;
  padding: 2px 7px; border-radius: 100px; flex-shrink: 0;
}

.notif-drop-enter-active, .notif-drop-leave-active { transition: opacity .15s, transform .15s; }
.notif-drop-enter-from, .notif-drop-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── SECCIONES ── */
.rev-section { margin-bottom: 36px; }
.rev-section-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--muted); margin-bottom: 10px;
}
.count-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 100px; }
.count-badge.orange { background: var(--orange-soft); color: var(--orange); }
.count-badge.blue   { background: var(--blue-soft);   color: var(--blue);   }
.count-badge.green  { background: var(--green-soft);  color: var(--green);  }

.rev-empty {
  border: 1px dashed var(--border); border-radius: 8px;
  padding: 20px; color: var(--muted); text-align: center; font-size: 13px;
}

/* ── TABLA ── */
.table-box { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: white; }

.table-head {
  display: grid; grid-template-columns: 1fr 120px 170px;
  padding: 10px 16px;
  background: #f9fafb; border-bottom: 1px solid var(--border);
  font-size: 10px; font-weight: 600; color: var(--muted);
}
.table-row {
  display: grid; grid-template-columns: 1fr 120px 170px;
  align-items: center; padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.table-row:last-child { border-bottom: none; }
.completed-row { grid-template-columns: 1fr auto; }

.rev-title { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.rev-area  { font-size: 11px; color: var(--muted); }
.row-urgent .rev-title { color: #b91c1c; }

/* ── ACCIONES ── */
.col-actions { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
.completed-actions { display: flex; align-items: center; gap: 8px; }

.btn-action {
  padding: 5px 9px; font-size: 11px;
  border-radius: 6px; background: #f3f4f6;
  border: 1px solid #e5e7eb; cursor: pointer;
  white-space: nowrap; color: #374151;
}
.btn-action:hover { background: #e5e7eb; }

.btn-chat {
  position: relative;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: #eff6ff; border: 1px solid #bfdbfe;
  border-radius: 8px; cursor: pointer; font-size: 15px;
  transition: background .15s;
}
.btn-chat:hover { background: #dbeafe; }

.btn-chat-sm {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: #f3f4f6; border: 1px solid #e5e7eb;
  border-radius: 6px; cursor: pointer; font-size: 14px;
}
.btn-chat-sm:hover { background: #eff6ff; border-color: #bfdbfe; }

.chat-unread-dot {
  position: absolute; top: -5px; right: -5px;
  min-width: 16px; height: 16px;
  background: #ef4444; color: white;
  font-size: 9px; font-weight: 700;
  border-radius: 100px; padding: 0 3px;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid white;
}

.btn-review {
  background: var(--blue, #3b82f6); color: white;
  border: none; padding: 6px 12px;
  border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-review:hover { background: #2563eb; }

/* ── MODAL OVERLAY ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}

/* ── MODAL CHAT ── */
.modal-chat {
  background: white; border-radius: 14px;
  width: 500px; height: 580px;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 48px rgba(0,0,0,0.18);
  overflow: hidden;
}
.chat-modal-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}
.chat-modal-info h3 { font-size: 15px; font-weight: 600; margin: 0 0 3px; }
.chat-modal-info p  { font-size: 12px; color: #6b7280; margin: 0; }

.chat-body { flex: 1; overflow: hidden; }
/* Quitar bordes propios del CommentPanel cuando está dentro del modal */
.chat-body :deep(.cp-panel) {
  border: none;
  border-radius: 0;
  height: 100%;
}

/* ── MODAL VEREDICTO ── */
.modal-content {
  background: white; border-radius: 12px;
  width: 440px; padding: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}
.modal-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 20px;
}
.modal-header h3 { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
.modal-subtitle { font-size: 12px; color: #6b7280; margin: 0; }
.close-x { background: none; border: none; font-size: 24px; cursor: pointer; color: #9ca3af; line-height: 1; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
.m-select {
  width: 100%; padding: 9px 12px;
  border: 1px solid #e5e7eb; border-radius: 8px;
  font-size: 14px; font-family: inherit; box-sizing: border-box;
}
.m-select:focus { outline: none; border-color: #3b82f6; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
.btn-sec {
  background: white; border: 1px solid #e5e7eb;
  padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer;
}
.btn-pri {
  background: var(--blue, #3b82f6); color: white;
  border: none; padding: 8px 16px;
  border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.btn-pri:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── VEREDICTOS ── */
.verdict-badge {
  font-size: 10px; font-weight: 700;
  padding: 3px 9px; border-radius: 100px; text-transform: uppercase;
}
.v-accept { background: #dcfce7; color: #166534; }
.v-minor  { background: #dbeafe; color: #1e40af; }
.v-major  { background: #fef3c7; color: #92400e; }
.v-reject { background: #fee2e2; color: #991b1b; }
</style>
