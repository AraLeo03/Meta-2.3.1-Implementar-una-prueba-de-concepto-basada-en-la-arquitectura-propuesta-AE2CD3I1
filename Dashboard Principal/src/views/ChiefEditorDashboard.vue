<template>
  <div class="ej-container">
    <h1 class="ej-title">Panel del Editor Jefe</h1>
    
    <div class="metrics-grid">
      <div class="metric-card"><div class="metric-label">Total recibidos</div><div class="metric-value c-default">{{ metricas.total }}</div></div>
      <div class="metric-card"><div class="metric-label">En proceso</div><div class="metric-value c-yellow">{{ metricas.enProceso }}</div></div>
      <div class="metric-card"><div class="metric-label">Aceptados</div><div class="metric-value c-green">{{ metricas.aceptados }}</div></div>
      <div class="metric-card"><div class="metric-label">Rechazados</div><div class="metric-value c-red">{{ metricas.rechazados }}</div></div>
    </div>

    <div class="avg-card">
      <span class="avg-label">Tiempo promedio de revisión</span>
      <span class="avg-value">{{ tiempoPromedio }} días</span>
    </div>

    <div class="section-title">Todos los manuscritos</div>
    <div v-if="loading" class="list-card">
      <div class="list-item">Cargando...</div>
    </div>
    <div v-else class="list-card">
      <div v-if="manuscripts.length === 0" class="list-item" style="justify-content: center; color: #999;">
        No hay manuscritos en el sistema.
      </div>
      <div v-for="m in manuscripts" :key="m.id" class="list-item">
        <div class="bn-title">
          {{ m.title }}
          <small>{{ m.authors.map(a => a.name).join(', ') }}</small>
        </div>
        <div class="bn-badge" :class="statusClass(m.status)">{{ m.status }}</div>
        <button class="btn-action" @click="openAssignModal(m)">Asignar Revisor</button>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>Asignar Revisor a: {{ selectedManuscript?.title }}</h2>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>

        <div class="modal-body grid-2-col">
          <div class="ia-section">
            <ReviewerSuggestions 
              :manuscriptId="selectedManuscript?.id"
              :manuscriptTitle="selectedManuscript?.title"
              :manuscriptAbstract="selectedManuscript?.description"
              :manuscriptTags="selectedManuscript?.tags"
              :assignedReviewers="selectedManuscript?.reviewers"
              :manuscriptAuthor="selectedManuscript?.authors[0]"
              @assign="handleIAAssign"
            />
          </div>

          <div class="manual-section">
            <h3 class="sub-title">Selección Manual</h3>
            <div class="form-group">
              <input type="text" v-model="searchQuery" placeholder="Buscar revisor por nombre o tag..." />
            </div>
            
            <div class="revisores-list">
              <div v-if="loadingRevisores" class="rev-loading">Buscando revisores...</div>
              <div v-else-if="filteredRevisores.length === 0" class="rev-empty">No se encontraron revisores</div>
              <div 
                v-for="r in filteredRevisores" 
                :key="r.id" 
                class="revisor-item"
                :class="{ 
                  'selected': selectedRevisorId === r.id, 
                  'assigned': isAlreadyAssigned(r.id),
                  'conflict-border': checkConflict(r)
                }"
                @click="!isAlreadyAssigned(r.id) && selectRevisor(r)"
              >
                <div class="rev-name">{{ r.nombre }}</div>
                <div class="rev-org">{{ r.organizacion }}</div>
                <div v-if="checkConflict(r)" class="conflict-tag">⚠️ Conflicto de Interés</div>
                <div v-if="isAlreadyAssigned(r.id)" class="rev-assigned">Ya asignado</div>
                <div class="rev-tags">
                  <span v-for="tag in r.tags" :key="tag" class="tag-chip">{{ tag }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="closeModal">Cancelar</button>
          <button 
            class="btn-primary" 
            :disabled="!selectedRevisorId || isAssigning" 
            @click="processAssignment"
          >
            {{ isAssigning ? 'Asignando...' : 'Confirmar Asignación Manual' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showConflictConfirm" class="modal-overlay z-top">
      <div class="modal-content modal-alert">
        <div class="alert-icon">⚠️</div>
        <h3>Conflicto de Interés Detectado</h3>
        <p>El revisor <strong>{{ pendingRevisor?.nombre }}</strong> pertenece a la misma organización que el autor ({{ selectedManuscript?.authors[0]?.affiliation }}).</p>
        <p class="alert-note">¿Desea forzar la asignación de todos modos? Esto quedará registrado en el historial.</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showConflictConfirm = false">Cancelar</button>
          <button class="btn-danger" @click="confirmForcedAssignment">Sí, Forzar Asignación</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import ReviewerSuggestions from '@/shared/components/ReviewerSuggestions.vue'
import { useAppStore } from '@/shared/stores/appStore'

const manuscripts = ref([])
const revisores = ref([])
const loading = ref(true)
const loadingRevisores = ref(false)
const showModal = ref(false)
const showConflictConfirm = ref(false)
const isAssigning = ref(false)

const selectedManuscript = ref(null)
const selectedRevisorId = ref(null)
const pendingRevisor = ref(null)
const searchQuery = ref('')

const metricas = ref({ total: 0, enProceso: 0, aceptados: 0, rechazados: 0 })
const tiempoPromedio = ref(0)

const store = useAppStore() // <--- NUEVA LÍNEA

const axiosConfig = computed(() => ({
  headers: {
    Authorization: `Bearer ${store.token}`
  }
}))

onMounted(() => {
  fetchManuscripts()
  fetchRevisores()
})

async function fetchManuscripts() {
  try {
    const res = await axios.get('/api/manuscripts', axiosConfig.value)
    manuscripts.value = res.data
    updateMetricas()
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

async function fetchRevisores() {
  loadingRevisores.value = true
  try {
    const res = await axios.get('/api/users?rol=revisor', axiosConfig.value)
    revisores.value = res.data
  } catch (err) { console.error(err) }
  finally { loadingRevisores.value = false }
}

function updateMetricas() {
  metricas.value.total = manuscripts.value.length
  metricas.value.enProceso = manuscripts.value.filter(m => m.status === 'en_revision').length
  metricas.value.aceptados = manuscripts.value.filter(m => m.status === 'aceptado').length
  metricas.value.rechazados = manuscripts.value.filter(m => m.status === 'rechazado').length
  tiempoPromedio.value = 14 // Mock
}

const filteredRevisores = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return revisores.value.filter(r => 
    r.nombre.toLowerCase().includes(q) || 
    r.tags.some(t => t.toLowerCase().includes(q))
  )
})

function openAssignModal(m) {
  selectedManuscript.value = m
  selectedRevisorId.value = null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedManuscript.value = null
}

function isAlreadyAssigned(revId) {
  return selectedManuscript.value?.reviewers?.some(r => r.reviewerId === revId.toString())
}

function checkConflict(revisor) {
  const authorOrg = selectedManuscript.value?.authors[0]?.affiliation?.trim().toLowerCase()
  const revOrg = revisor.organizacion?.trim().toLowerCase()
  return authorOrg && revOrg && authorOrg === revOrg
}

function selectRevisor(r) {
  selectedRevisorId.value = r.id
  pendingRevisor.value = r
}

// Maneja la asignación desde el componente de IA
function handleIAAssign(revId, hasConflict) {
  const rev = revisores.value.find(r => r.id === revId)
  pendingRevisor.value = rev
  selectedRevisorId.value = revId
  
  if (hasConflict) {
    showConflictConfirm.value = true
  } else {
    processAssignment(false)
  }
}

// Maneja la asignación desde el botón "Confirmar Manual"
function processAssignment() {
  if (checkConflict(pendingRevisor.value)) {
    showConflictConfirm.value = true
  } else {
    confirmForcedAssignment(false)
  }
}

async function confirmForcedAssignment(forced = true) {
  isAssigning.value = true
  try {
    await axios.post(`/api/manuscripts/${selectedManuscript.value.id}/assign-reviewer`, {
      reviewerId: selectedRevisorId.value,
      hasConflict: forced
    }, axiosConfig.value)
    alert('Revisor asignado exitosamente')
    showConflictConfirm.value = false
    closeModal()
    fetchManuscripts()
  } catch (err) {
    alert(err.response?.data?.error || 'Error al asignar')
  } finally {
    isAssigning.value = false
  }
}

function statusClass(s) {
  if (s === 'aceptado') return 'bn-ok'
  if (s === 'rechazado') return 'bn-critical'
  if (s === 'en_revision') return 'bn-warn'
  return ''
}
</script>

<style scoped>
/* Estilos base del Editor Jefe */
.ej-container { padding: 32px; max-width: 1100px; margin: 0 auto; font-family: 'Inter', sans-serif; background: #f9fafb; min-height: 100vh; }
.ej-title { font-size: 28px; font-weight: 800; color: #111827; margin-bottom: 24px; }

.metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.metric-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.metric-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
.metric-value { font-size: 32px; font-weight: 800; }
.c-yellow { color: #d97706; } .c-green { color: #059669; } .c-red { color: #dc2626; } .c-default { color: #111827; }

.avg-card { background: #eff6ff; padding: 16px 24px; border-radius: 12px; border: 1px solid #dbeafe; display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.avg-label { font-size: 14px; font-weight: 600; color: #1e40af; }
.avg-value { font-size: 20px; font-weight: 800; color: #1d4ed8; }

.section-title { font-size: 14px; font-weight: 700; color: #4b5563; text-transform: uppercase; margin-bottom: 12px; }
.list-card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
.list-item { display: flex; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid #f3f4f6; }
.bn-title { flex: 1; font-weight: 600; font-size: 15px; color: #111827; }
.bn-title small { display: block; font-weight: 400; color: #6b7280; font-size: 12px; margin-top: 2px; }

.bn-badge { padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
.bn-ok { background: #d1fae5; color: #065f46; }
.bn-warn { background: #fef3c7; color: #92400e; }
.bn-critical { background: #fee2e2; color: #991b1b; }

.btn-action { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; }

/* MODAL STYLES */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.z-top { z-index: 200; }
.modal-content { background: white; border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
.modal-large { max-width: 1000px; }
.modal-header { padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

.revisores-list { height: 350px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }
.revisor-item { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; cursor: pointer; }
.revisor-item.selected { border-color: #4f46e5; background: #f5f3ff; }
.revisor-item.conflict-border { border-left: 4px solid #ef4444; }
.conflict-tag { color: #ef4444; font-size: 11px; font-weight: 700; margin-top: 4px; }

.modal-actions { padding: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; }
.btn-primary { background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-secondary { background: white; border: 1px solid #d1d5db; color: #374151; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-danger { background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }

.modal-alert { text-align: center; padding: 32px; max-width: 400px; }
.alert-icon { font-size: 48px; margin-bottom: 16px; }
.alert-note { font-size: 13px; color: #6b7280; margin-top: 12px; }
</style>