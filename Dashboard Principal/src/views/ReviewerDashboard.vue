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
          <span class="col-actions">Acciones</span>
        </div>
        <div v-for="rev in activeReviews" :key="rev.id" class="table-row" :class="{ 'row-urgent': rev.daysLeft < 3 }">
          <div class="col-title">
            <div class="rev-title">{{ rev.title }}</div>
            <div class="rev-area">{{ rev.area }}</div>
          </div>
          <div class="col-deadline"><DeadlineBar :days-left="rev.daysLeft" /></div>
          <div class="col-actions">
            <button @click="viewPDF(rev.id)" class="btn-circle" title="Ver PDF">Ver PDF</button>
            <button class="btn-review" @click="openModal(rev)">Revisar</button>
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
            <div class="rev-area">{{ rev.area }} · {{ new Date(rev.completedAt).toLocaleDateString() }}</div>
          </div>
          <span class="verdict-badge" :class="verdictClass(rev.verdict)">{{ rev.verdict }}</span>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Enviar Revisión</h3>
          <button class="close-x" @click="showModal = false">&times;</button>
        </div>
        <p class="modal-subtitle">{{ selectedRev?.title }}</p>
        
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

        <div class="form-group">
          <label>Comentarios adicionales (opcional)</label>
          <textarea v-model="form.comments" rows="4" placeholder="Escribe tus notas técnicas..."></textarea>
        </div>

        <div class="modal-footer">
          <button class="btn-sec" @click="showModal = false">Cancelar</button>
          <button class="btn-pri" :disabled="!form.verdict || processing" @click="submitReview">
            {{ processing ? 'Enviando...' : 'Confirmar Veredicto' }}
          </button>
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

const invitations = ref([])
const activeReviews = ref([])
const completedReviews = ref([])

// Lógica del Modal
const showModal = ref(false)
const processing = ref(false)
const selectedRev = ref(null)
const form = ref({ verdict: '', comments: '' })

onMounted(async () => {
  await fetchInvitations()
  await fetchMyReviews()
})

function viewPDF(id) {
  window.open(`${API_URL}/manuscripts/${id}/view`, '_blank');
}

async function fetchInvitations() {
  if (!authStore.user?.id) return
  try {
    const res = await axios.get(`${API_URL}/manuscripts/reviewer/${authStore.user.id}/invitations`)
    invitations.value = res.data
  } catch (err) { console.error(err) }
}

async function fetchMyReviews() {
  if (!authStore.user?.id) return;
  try {
    const res = await axios.get(`${API_URL}/manuscripts/reviewer/${authStore.user.id}`);
    const data = res.data;

    invitations.value = data.filter(r => r.status === 'pendiente').map(r => ({
      id: r.manuscriptId,
      title: r.title
    }));

    activeReviews.value = data.filter(r => r.status === 'aceptada').map(r => ({
      id: r.manuscriptId,
      title: r.title,
      pdfName: r.pdfName,
      area: r.tags?.join(', ') || 'N/A',
      daysLeft: r.deadline ? Math.ceil((new Date(r.deadline) - new Date())/(1000*60*60*24)) : 0
    }));
    
    completedReviews.value = data.filter(r => r.status === 'completada');
  } catch (err) {
    console.error("Error al cargar:", err);
  }
}

function openModal(rev) {
  selectedRev.value = rev
  form.value = { verdict: '', comments: '' }
  showModal.value = true
}

async function submitReview() {
  processing.value = true
  try {
    await axios.post(`${API_URL}/manuscripts/${selectedRev.value.id}/submit-review`, {
      ...form.value,
      reviewerId: authStore.user.id
    })
    store.pushToast('Revisión completada con éxito')
    showModal.value = false
    await fetchMyReviews()
  } catch (err) {
    store.pushToast('Error al enviar la revisión')
  } finally {
    processing.value = false
  }
}

async function acceptInvitation(id) {
  try {
    await axios.post(`${API_URL}/manuscripts/${id}/accept-invitation`)
    store.pushToast('Invitación aceptada')
    await fetchInvitations(); await fetchMyReviews()
  } catch (err) { store.pushToast('Error al aceptar') }
}

async function declineInvitation(id) {
  try {
    await axios.post(`${API_URL}/manuscripts/${id}/decline-invitation`)
    store.pushToast('Invitación declinada')
    await fetchInvitations()
  } catch (err) { store.pushToast('Error al declinar') }
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
/* ESTILOS EXISTENTES */
.rev-wrap { max-width: 700px; margin: 0 auto; padding-top: 40px; }
.rev-topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
.brand { font-size: 18px; font-weight: 600; }
.rev-section { margin-bottom: 36px; }
.rev-section-label { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: 10px; }
.count-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 100px; }
.count-badge.orange { background: var(--orange-soft); color: var(--orange); }
.count-badge.blue { background: var(--blue-soft); color: var(--blue); }
.count-badge.green { background: var(--green-soft); color: var(--green); }
.rev-empty { border: 1px dashed var(--border); border-radius: 8px; padding: 20px; color: var(--muted); text-align: center; font-size: 13px; }

.table-box { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: white; }
.table-head { display: grid; grid-template-columns: 1fr 120px 140px; padding: 10px 16px; background: #f9fafb; border-bottom: 1px solid var(--border); font-size: 10px; font-weight: 600; color: var(--muted); }
.table-row { display: grid; grid-template-columns: 1fr 120px 140px; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--border); }
.table-row:last-child { border-bottom: none; }
.rev-title { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.rev-area { font-size: 11px; color: var(--muted); }

/* ACCIONES */
.col-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-circle { text-decoration: none; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #f3f4f6; font-size: 14px; border: 1px solid #e5e7eb; cursor: pointer; }
.btn-review { background: var(--blue); color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn-review:hover { background: #2563eb; }

/* MODAL */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; border-radius: 12px; width: 450px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.close-x { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--muted); }
.modal-subtitle { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
.m-select, textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; font-family: inherit; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
.btn-sec { background: white; border: 1px solid var(--border); padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-pri { background: var(--blue); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-pri:disabled { opacity: 0.5; }

/* VEREDICTOS */
.verdict-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 100px; text-transform: uppercase; }
.v-accept { background: #dcfce7; color: #166534; }
.v-minor { background: #dbeafe; color: #1e40af; }
.v-major { background: #fef3c7; color: #92400e; }
.v-reject { background: #fee2e2; color: #991b1b; }
</style>