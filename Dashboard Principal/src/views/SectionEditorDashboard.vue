<template>
  <div class="se-container">
    <h1 class="se-title">Panel del Editor de Sección</h1>
    <div class="counters-grid">
      <div class="counter-card"><div class="counter-label">En proceso</div><div class="counter-value c-yellow">{{ contadores.enProceso }}</div></div>
      <div class="counter-card"><div class="counter-label">Pendientes de decisión</div><div class="counter-value c-orange">{{ contadores.pendientesDecision }}</div></div>
      <div class="counter-card"><div class="counter-label">Listos para decidir</div><div class="counter-value c-green">{{ contadores.listosDecidir }}</div></div>
    </div>

    <div class="section-title">Todos los manuscritos</div>
    <div v-if="loading" class="list-card">
      <div class="ms-item">Cargando...</div>
    </div>
    <div v-else-if="manuscripts.length === 0" class="list-card">
      <div class="ms-item">No hay manuscritos disponibles</div>
    </div>
    <div v-else class="list-card">
      <div v-for="m in manuscripts" :key="m.id" class="ms-item">
        <div class="ms-main">
          <div class="ms-title">{{ m.title }}</div>
          <div class="ms-meta">
            <span>{{ m.status }}</span>
            <span class="dot">·</span>
            <span>{{ m.authors.map(a => a.name).join(', ') }}</span>
            <span class="dot">·</span>
            <span>{{ m.date }}</span>
          </div>
          <div class="ms-tags">
            <span v-for="tag in m.tags" :key="tag" class="tag-chip">{{ tag }}</span>
          </div>
          <div v-if="m.reviewers && m.reviewers.length > 0" class="ms-reviewers">
            <span class="reviewers-label">Revisores ({{ m.reviewers.length }}/3):</span>
            <span v-for="rev in m.reviewers.slice(0, 3)" :key="rev.reviewerId" class="reviewer-chip" :class="rev.status">
              {{ rev.reviewerName || 'Revisor' }}
            </span>
          </div>
        </div>
        <div class="ms-actions">
          <button class="btn-asignar" :disabled="!canAssignReviewer(m)" @click="openAssignModal(m)">
            + Asignar revisor
          </button>
          <a :href="'/api/manuscripts/' + m.id + '/download'" target="_blank" class="btn-ver">Ver PDF</a>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAssignModal" class="modal-overlay" @click.self="closeAssignModal">
          <div class="modal">
            <div class="modal-header">
              <h2>Asignar revisor</h2>
              <p>{{ selectedManuscript?.title }}</p>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Buscar revisor por nombre o tema</label>
                <input v-model="searchFilter" type="text" placeholder="Buscar...">
              </div>
                <div class="revisores-list">
                <div v-if="reviewersLoading" class="rev-loading">Cargando revisores...</div>
                <div v-else-if="reviewers.length === 0" class="rev-empty">No hay revisores disponibles</div>
                <div v-else v-for="r in reviewers" :key="r.id" 
                  class="revisor-item" 
                  :class="{ selected: selectedReviewer === r.id, assigned: isAssignedToCurrentManuscript(r.id) }"
                  @click="selectReviewer(r.id)">
                  <div class="rev-info">
                    <div class="rev-name">{{ r.nombre }}</div>
                    <div class="rev-org">{{ r.organizacion }}</div>
                    <div class="rev-tags">
                      <span v-for="tag in r.tags" :key="tag" class="tag-chip">{{ tag }}</span>
                    </div>
                  </div>
                  <div v-if="isAssignedToCurrentManuscript(r.id)" class="rev-assigned">Asignado a este manuscrito</div>
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" @click="closeAssignModal">Cancelar</button>
              <button class="btn-submit" :disabled="!selectedReviewer || assigning || isAssignedToCurrentManuscript(selectedReviewer)" @click="assignReviewer">
                {{ assigning ? 'Asignando...' : 'Asignar revisor' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { useAppStore } from '@/shared/stores/appStore'

const store = useAppStore()
const API_URL = '/api/manuscripts'

const manuscripts = ref([])
const reviewers = ref([])
const loading = ref(true)
const reviewersLoading = ref(false)
const showAssignModal = ref(false)
const selectedManuscript = ref(null)
const selectedReviewer = ref(null)
const searchFilter = ref('')
const assigning = ref(false)

let debounceTimer = null

onMounted(async () => {
  await fetchManuscripts()
  await fetchReviewers()
})

watch(searchFilter, async () => {
  debouncedSearch()
})

function debouncedSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchReviewers(searchFilter.value)
  }, 300)
}

async function fetchManuscripts() {
  loading.value = true
  try {
    const res = await axios.get(API_URL)
    manuscripts.value = res.data
  } catch (err) {
    console.error('Error fetching manuscripts:', err)
  } finally {
    loading.value = false
  }
}

async function fetchReviewers(search = '') {
  reviewersLoading.value = true
  try {
    const url = search ? `/api/users/reviewers?search=${encodeURIComponent(search)}` : '/api/users/reviewers'
    const res = await axios.get(url)
    reviewers.value = res.data
  } catch (err) {
    console.error('Error fetching reviewers:', err)
  } finally {
    reviewersLoading.value = false
  }
}

function openAssignModal(m) {
  selectedManuscript.value = m
  selectedReviewer.value = null
  showAssignModal.value = true
  fetchReviewers()
}

function closeAssignModal() {
  showAssignModal.value = false
  selectedManuscript.value = null
  selectedReviewer.value = null
}

function selectReviewer(id) {
  if (!isAssignedToCurrentManuscript(id)) {
    selectedReviewer.value = id
  }
}

function isAssignedToCurrentManuscript(reviewerId) {
  if (!selectedManuscript.value) return false
  return selectedManuscript.value.reviewers?.some(r => r.reviewerId === reviewerId)
}

function canAssignReviewer(m) {
  return !m.reviewers || m.reviewers.length < 3
}

async function assignReviewer() {
  if (!selectedReviewer.value || !selectedManuscript.value || assigning.value) return
  
  assigning.value = true
  try {
    await axios.post(`${API_URL}/${selectedManuscript.value.id}/assign-reviewer`, {
      reviewerId: selectedReviewer.value
    })
    store.pushToast('Revisor asignado correctamente')
    await fetchManuscripts()
    closeAssignModal()
  } catch (err) {
    console.error('Error assigning reviewer:', err)
    store.pushToast('Error al asignar revisor')
  } finally {
    assigning.value = false
  }
}

const contadores = computed(() => ({
  enProceso: manuscripts.value.filter(m => m.status === 'En revisión').length,
  pendientesDecision: manuscripts.value.filter(m => m.status === 'Decisión').length,
  listosDecidir: manuscripts.value.filter(m => m.status === 'Aceptado' || m.status === 'Rechazado').length
}))
</script>

<style scoped>
.se-container { max-width: 720px; margin: 0 auto; }
.se-title { font-size: 20px; font-weight: 600; margin-bottom: 20px; }
.counters-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 28px; }
.counter-card { background: white; border-radius: var(--radius); padding: 16px; border: 1px solid var(--border); }
.counter-label { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.counter-value { font-size: 28px; font-weight: 600; }
.c-yellow { color: var(--yellow); }
.c-orange { color: var(--orange); }
.c-green { color: var(--green); }
.section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 8px; }
.list-card { background: white; border-radius: var(--radius); border: 1px solid var(--border); overflow: hidden; margin-bottom: 28px; }
.ms-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--light); }
.ms-item:last-child { border-bottom: none; }
.ms-main { flex: 1; min-width: 0; }
.ms-title { font-size: 14px; font-weight: 500; line-height: 1.3; margin-bottom: 4px; }
.ms-meta { font-size: 12px; color: var(--muted); display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.ms-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.ms-reviewers { margin-top: 8px; }
.reviewers-label { font-size: 11px; color: var(--muted); margin-right: 4px; }
.reviewer-chip { font-size: 10px; padding: 2px 6px; border-radius: 100px; margin-left: 2px; }
.reviewer-chip.pendiente { background: #fef3c7; color: #d97706; }
.reviewer-chip.aceptada { background: #dbeafe; color: #2563eb; }
.reviewer-chip.completada { background: #dcfce7; color: #16a34a; }
.tag-chip { font-size: 10px; padding: 2px 8px; background: var(--light); border-radius: 100px; color: var(--muted); }
.dot { color: #ccc; }
.ms-actions { display: flex; gap: 8px; flex-shrink: 0; }
.btn-asignar { font-size: 12px; font-weight: 500; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: white; white-space: nowrap; cursor: pointer; }
.btn-asignar:hover:not([disabled]) { background: var(--light); }
.btn-asignar:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ver { font-size: 12px; font-weight: 500; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: white; white-space: nowrap; text-decoration: none; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal { background: var(--white); border-radius: 16px; width: 100%; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden; }
.modal-header { padding: 24px 24px 10px; }
.modal-header h2 { font-size: 20px; font-weight: 600; margin: 0 0 6px; }
.modal-header p { font-size: 13px; color: var(--muted); margin: 0; }
.modal-body { padding: 16px 24px; max-height: 400px; overflow-y: auto; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px; }
.form-group input { width: 100%; border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 14px; outline: none; }
.form-group input:focus { border-color: var(--blue); }
.revisores-list { max-height: 300px; overflow-y: auto; }
.rev-loading, .rev-empty { padding: 20px; text-align: center; color: var(--muted); font-size: 13px; }
.revisor-item { padding: 12px; border: 2px solid var(--border); border-radius: 10px; margin-bottom: 8px; cursor: pointer; }
.revisor-item:hover:not(.assigned) { background: var(--light); }
.revisor-item.selected { border-color: var(--blue); background: var(--blue-soft); }
.revisor-item.assigned { opacity: 0.7; cursor: not-allowed; border-color: var(--green); background: #f0fdf4; }
.revisor-item.assigned:hover { background: #f0fdf4; }
.rev-assigned { font-size: 11px; color: var(--green); font-weight: 600; margin-top: 4px; }
.rev-name { font-size: 14px; font-weight: 500; }
.rev-org { font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.rev-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.modal-actions { display: flex; gap: 10px; padding: 16px 24px 24px; }
.btn-cancel { flex: 1; padding: 12px 20px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--white); font-size: 14px; cursor: pointer; }
.btn-submit { flex: 1; padding: 12px 20px; border: none; border-radius: 10px; background: var(--blue); font-size: 14px; color: white; cursor: pointer; }
.btn-submit:disabled { opacity: 0.5; }
</style>