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

    <div class="section-title">Manuscritos recientes</div>
    <div v-if="loading" class="list-card">
      <div class="list-item">Cargando...</div>
    </div>
    <div v-else class="list-card">
      <div v-if="manuscripts.length === 0" class="list-item" style="justify-content: center; color: #999;">
        No hay manuscritos en el sistema.
      </div>
      <div v-for="m in manuscripts" :key="m.id || m._id" class="list-item">
        <div class="bn-title">
          {{ m.title }}
          <small>{{ formatAuthors(m.authors) }}</small>
          <small v-if="m.reviewers && m.reviewers.length > 0" style="color: var(--blue); margin-top: 4px;">
            Revisores asignados: {{ m.reviewers.length }}/3
          </small>
        </div>
        <span class="bn-badge" :class="badgeClass(m.status)">{{ formatStatus(m.status) }}</span>
        
        <button 
          v-if="canAssign(m)" 
          class="btn-assign" 
          @click="openAssignModal(m)">
          Asignar Revisor
        </button>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h2 style="margin-top:0; font-size:18px;">Asignar Revisor</h2>
        <p style="font-size:13px; color:#666; margin-bottom:15px;">
          Manuscrito: <strong>{{ selectedManuscript?.title }}</strong>
        </p>
        
        <div style="margin-bottom: 20px;">
          <label style="display:block; font-size:12px; margin-bottom:5px; font-weight: bold;">Selecciona el revisor:</label>
          <select v-model="selectedReviewerId" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family: inherit;">
            <option value="">-- Seleccione un revisor --</option>
            <option v-for="rev in reviewers" :key="rev.id || rev._id" :value="rev.id || rev._id">
              {{ rev.nombres }} {{ rev.apellido_paterno }} ({{ rev.organizacion }})
            </option>
          </select>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button style="padding:8px 16px; border:none; border-radius:4px; cursor:pointer; background:#eee;" @click="showModal = false">
            Cancelar
          </button>
          <button 
            style="padding:8px 16px; border:none; border-radius:4px; background:var(--green); color:white; cursor:pointer; font-weight: bold;" 
            @click="confirmAssignment">
            {{ processing ? 'Guardando...' : 'Confirmar' }}
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

const store = useAppStore()
const API_URL = '/api/manuscripts'
const USERS_URL = '/api/users'

const manuscripts = ref([])
const reviewers = ref([]) 
const loading = ref(true)
const processing = ref(false)
const showModal = ref(false)
const selectedManuscript = ref(null)
const selectedReviewerId = ref('')

onMounted(async () => {
  await fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const [resM, resU] = await Promise.all([
      axios.get(API_URL),
      axios.get(USERS_URL)
    ])
    manuscripts.value = resM.data
    reviewers.value = resU.data.filter(u => u.rol === 'revisor')
  } catch (err) {
    console.error('Error al cargar datos:', err)
  } finally {
    loading.value = false
  }
}

async function confirmAssignment() {
  // 1. OBLIGAMOS A QUE AVISE SI ALGO FALTA
  if (!selectedReviewerId.value) {
    store.pushToast('⚠️ Por favor, selecciona un revisor de la lista desplegable');
    return;
  }
  
  processing.value = true;
  const mId = selectedManuscript.value.id || selectedManuscript.value._id;
  const rId = selectedReviewerId.value;
  
  console.log(`Intentando asignar revisor ${rId} al manuscrito ${mId}`);
  
  try {
    const res = await axios.post(`${API_URL}/${mId}/assign-reviewer`, {
      reviewerId: rId
    });
    
    console.log('Respuesta del servidor:', res.data);
    store.pushToast('¡Revisor asignado con éxito!');
    showModal.value = false;
    await fetchData(); 
  } catch (err) {
    console.error('Error del servidor:', err.response || err);
    store.pushToast(err.response?.data?.error || 'Error al asignar el revisor en el servidor');
  } finally {
    processing.value = false;
  }
}

function openAssignModal(m) {
  selectedManuscript.value = m
  selectedReviewerId.value = ''
  showModal.value = true
}

function canAssign(m) {
  const revs = m.reviewers?.length || 0;
  const status = (m.status || '').toLowerCase();
  return revs < 3 && status !== 'aceptado' && status !== 'rechazado';
}

function formatAuthors(authors) {
  if (!authors) return 'Sin autor'
  if (Array.isArray(authors)) {
    return authors.map(a => typeof a === 'object' ? (a.name || a.nombres) : a).join(', ')
  }
  return authors
}

function formatStatus(status) {
  if (!status) return 'Enviado';
  const s = status.toLowerCase();
  if (s === 'en_revision') return 'En revisión';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function badgeClass(status) {
  const s = (status || 'enviado').toLowerCase()
  if (s === 'rechazado') return 'bn-badge bn-critical'
  if (s === 'aceptado') return 'bn-badge bn-ok'
  return 'bn-badge bn-warn'
}

const metricas = computed(() => ({
  total: manuscripts.value.length,
  enProceso: manuscripts.value.filter(m => !['aceptado', 'rechazado'].includes((m.status || '').toLowerCase())).length,
  aceptados: manuscripts.value.filter(m => (m.status || '').toLowerCase() === 'aceptado').length,
  rechazados: manuscripts.value.filter(m => (m.status || '').toLowerCase() === 'rechazado').length
}))

const tiempoPromedio = computed(() => manuscripts.value.length > 0 ? 14 : 0)
</script>

<style scoped>
.ej-container { max-width: 680px; margin: 0 auto; }
.ej-title { font-size: 20px; font-weight: 600; margin-bottom: 20px; }
.metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.metric-card { background: white; border-radius: var(--radius); padding: 16px; border: 1px solid var(--border); }
.metric-label { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.metric-value { font-size: 28px; font-weight: 600; }
.c-default { color: var(--text); }
.c-yellow { color: var(--yellow); }
.c-green { color: var(--green); }
.c-red { color: var(--red); }
.avg-card { background: white; border-radius: var(--radius); padding: 16px; border: 1px solid var(--border); margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center; }
.avg-label { font-size: 13px; color: var(--muted); }
.avg-value { font-size: 22px; font-weight: 600; color: var(--blue); }
.section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 8px; }
.list-card { background: white; border-radius: var(--radius); border: 1px solid var(--border); overflow: hidden; margin-bottom: 28px; }
.list-item { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--light); }
.list-item:last-child { border-bottom: none; }
.bn-title { flex: 1; font-size: 14px; line-height: 1.3; }
.bn-title small { display: block; font-size: 11px; color: #aaa; margin-top: 2px; }
.bn-badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
.bn-critical { background: var(--red-soft); color: var(--red); }
.bn-warn { background: var(--yellow-soft); color: var(--yellow); }
.bn-ok { background: var(--green-soft); color: var(--green); }

.btn-assign {
  background: var(--blue, #3498db);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-left: 10px;
}

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; padding: 25px; border-radius: 8px; width: 400px; max-width: 90%; }
</style>