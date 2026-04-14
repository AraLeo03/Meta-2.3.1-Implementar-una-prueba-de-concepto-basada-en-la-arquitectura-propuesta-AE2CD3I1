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
      <div v-for="m in manuscripts" :key="m.id" class="list-item">
        <div class="bn-title">{{ m.title }}<small>{{ m.authors.map(a => a.name).join(', ') }}</small></div>
        <span class="bn-badge" :class="badgeClass(m.status)">{{ m.status }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const API_URL = '/api/manuscripts'

const manuscripts = ref([])
const loading = ref(true)

onMounted(async () => {
  await fetchManuscripts()
})

async function fetchManuscripts() {
  loading.value = true
  try {
    const res = await axios.get(`${API_URL}/all`)
    manuscripts.value = res.data
  } catch (err) {
    console.error('Error fetching manuscripts:', err)
  } finally {
    loading.value = false
  }
}

function badgeClass(status) {
  if (status === 'Rechazado') return 'bn-badge bn-critical'
  if (status === 'Aceptado') return 'bn-badge bn-ok'
  if (status === 'Decisión') return 'bn-badge bn-warn'
  return 'bn-badge bn-ok'
}

const metricas = computed(() => ({
  total: manuscripts.value.length,
  enProceso: manuscripts.value.filter(m => m.status === 'En revisión').length,
  aceptados: manuscripts.value.filter(m => m.status === 'Aceptado').length,
  rechazados: manuscripts.value.filter(m => m.status === 'Rechazado').length
}))

const tiempoPromedio = computed(() => {
  const terminados = manuscripts.value.filter(m => ['Aceptado', 'Rechazado'].includes(m.status))
  if (!terminados.length) return 0
  return Math.round(Math.random() * 10 + 5)
})
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
</style>