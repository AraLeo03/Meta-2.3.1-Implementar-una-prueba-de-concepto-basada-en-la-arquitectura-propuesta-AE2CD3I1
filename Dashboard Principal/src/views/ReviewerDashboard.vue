<template>
  <div class="rev-wrap">
    <div class="rev-topbar">
      <div class="brand">Dashboard del revisor</div>
    </div>

    <div class="rev-section">
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
        />
      </div>
    </div>

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
          <span class="col-offline">Offline</span>
        </div>
        <div v-for="rev in activeReviews" :key="rev.id" class="table-row" :class="{ 'row-urgent': rev.daysLeft < 3 }">
          <div class="col-title">
            <div class="rev-title">{{ rev.title }}</div>
            <div class="rev-area">{{ rev.area }}</div>
            <div v-if="rev.progress > 0" class="prog-wrap">
              <div class="prog-bar">
                <div class="prog-fill" :class="rev.daysLeft < 3 ? 'fill-urgent' : 'fill-normal'" :style="{ width: rev.progress + '%' }"></div>
              </div>
              <span class="prog-label">{{ rev.progress }}%</span>
            </div>
          </div>
          <div class="col-deadline"><DeadlineBar :days-left="rev.daysLeft" /></div>
          <div class="col-offline">
            <span v-if="rev.offlineAvailable" class="offline-chip">Leer offline</span>
            <span v-else class="no-offline">—</span>
          </div>
        </div>
      </div>
    </div>

    <div class="rev-section">
      <div class="rev-section-label">
        Revisiones completadas 
        <span v-if="completedReviews.length > 0" class="count-badge green">{{ completedReviews.length }}</span>
      </div>
      <div v-if="completedReviews.length === 0" class="rev-empty">
        <span class="rev-empty-text">Aún no has completado ninguna revisión</span>
      </div>
      <div v-else class="table-box">
        <div v-for="rev in completedReviews" :key="rev.id" class="table-row">
          <div class="col-title">
            <div class="rev-title">{{ rev.title }}</div>
            <div class="rev-area">{{ rev.area }} · {{ rev.completedAt }}</div>
          </div>
          <span class="verdict-badge" :class="verdictClass(rev.verdict)">{{ rev.verdict }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useAppStore } from '@/shared/stores/appStore'
import { useAuthStore } from '@/shared/stores/authStore'
import InvitationCard from '@/shared/components/InvitationCard.vue'
import DeadlineBar from '@/shared/components/DeadlineBar.vue'

const store = useAppStore()
const authStore = useAuthStore()
const API_URL = '/api'

const loading = ref(true)
const invitations = ref([])
const activeReviews = ref([])
const completedReviews = ref([])

onMounted(async () => {
  await fetchInvitations()
  await fetchMyReviews()
})

async function fetchInvitations() {
  if (!authStore.user?.id) return
  try {
    const res = await axios.get(`${API_URL}/users/me/invitations?userId=${authStore.user.id}`)
    invitations.value = res.data
  } catch (err) {
    console.error('Error fetching invitations:', err)
  }
}

async function fetchMyReviews() {
  if (!authStore.user?.id) return
  try {
    const res = await axios.get(`${API_URL}/manuscripts/reviewer/${authStore.user.id}`)
    const reviews = res.data
    activeReviews.value = reviews.filter(r => r.status === 'pendiente' || r.status === 'aceptada').map(r => ({
      id: r.manuscriptId,
      title: r.title,
      area: r.tags?.join(', ') || '',
      daysLeft: Math.ceil((new Date(r.deadline) - new Date()) / (1000 * 60 * 60 * 24)),
      progress: 0,
      offlineAvailable: false
    }))
    completedReviews.value = reviews.filter(r => r.status === 'completada').map(r => ({
      id: r.manuscriptId,
      title: r.title,
      area: r.tags?.join(', ') || '',
      completedAt: r.completedAt,
      verdict: r.verdict
    }))
  } catch (err) {
    console.error('Error fetching my reviews:', err)
  }
}

async function acceptInvitation(id) {
  if (!authStore.user?.id) return
  try {
    await axios.post(`${API_URL}/users/me/invitations/${id}/accept`, { userId: authStore.user.id })
    const inv = invitations.value.find(i => i.id === id)
    if (inv) {
      activeReviews.value.unshift({
        id: inv.manuscriptId,
        title: inv.title,
        area: '',
        daysLeft: 21,
        progress: 0,
        offlineAvailable: false
      })
    }
    invitations.value = invitations.value.filter(i => i.id !== id)
    store.pushToast('Invitación aceptada')
  } catch (err) {
    console.error('Error accepting invitation:', err)
    store.pushToast('Error al aceptar invitación')
  }
}

async function declineInvitation(id) {
  if (!authStore.user?.id) return
  try {
    await axios.post(`${API_URL}/users/me/invitations/${id}/decline`, { userId: authStore.user.id })
    invitations.value = invitations.value.filter(i => i.id !== id)
    store.pushToast('Invitación declinada')
  } catch (err) {
    console.error('Error declining invitation:', err)
    store.pushToast('Error al declinar invitación')
  }
}

function verdictClass(verdict) {
  return {
    'Aceptar': 'v-accept',
    'Revisiones menores': 'v-minor',
    'Revisiones mayores': 'v-major',
    'Rechazar': 'v-reject'
  }[verdict] ?? ''
}

const offlineCount = computed(() => 
  activeReviews.value.filter(r => r.offlineAvailable).length + 
  invitations.value.filter(i => i.offlineAvailable).length
)
</script>

<style scoped>
.rev-wrap { max-width: 700px; margin: 0 auto; }
.rev-topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
.brand { font-size: 18px; font-weight: 600; }
.offline-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; background: var(--blue-soft); color: var(--blue); border: 1px solid #bfdbfe; }
.offline-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); animation: blink 2s ease-in-out infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
.rev-section { margin-bottom: 36px; }
.rev-section-label { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: 10px; }
.count-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 100px; }
.count-badge.orange { background: var(--orange-soft); color: var(--orange); }
.count-badge.blue { background: var(--blue-soft); color: var(--blue); }
.count-badge.green { background: var(--green-soft); color: var(--green); }
.rev-empty { display: flex; align-items: center; gap: 10px; border: 1px dashed var(--border); border-radius: var(--radius); background: var(--white); padding: 20px 16px; color: var(--muted); }
.rev-empty-text { font-size: 13px; }

.table-box { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--white); }
.table-head { display: grid; grid-template-columns: 1fr 130px 90px; padding: 8px 16px; background: var(--light); border-bottom: 1px solid var(--border); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); gap: 12px; }
.table-row { display: grid; grid-template-columns: 1fr 130px 90px; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--border); }
.table-row:last-child { border-bottom: none; }
.table-row:hover { background: var(--light); }
.col-title { min-width: 0; }
.col-deadline, .col-offline { display: flex; align-items: center; }
.rev-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
.rev-area { font-size: 11px; color: var(--muted); }
.prog-wrap { display: flex; align-items: center; gap: 8px; margin-top: 7px; }
.prog-bar { flex: 1; height: 3px; background: var(--light); border-radius: 3px; overflow: hidden; }
.prog-fill { height: 100%; border-radius: 3px; transition: width .5s ease; }
.fill-normal { background: var(--blue); }
.fill-urgent { background: var(--red); }
.prog-label { font-size: 10px; color: var(--muted); flex-shrink: 0; }
.offline-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 500; padding: 2px 7px; border-radius: 100px; background: var(--blue-soft); color: var(--blue); border: 1px solid #bfdbfe; }
.no-offline { font-size: 12px; color: #d4d4d8; }
.verdict-badge { font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 100px; white-space: nowrap; flex-shrink: 0; }
.v-accept { background: var(--green-soft); color: var(--green); }
.v-minor { background: var(--blue-soft); color: var(--blue); }
.v-major { background: var(--orange-soft); color: var(--orange); }
.v-reject { background: var(--red-soft); color: var(--red); }
</style>