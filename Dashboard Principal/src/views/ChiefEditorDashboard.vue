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

    <div class="section-title">Cuellos de botella</div>
    <div class="list-card">
      <div v-for="m in cuellos" :key="m.id" class="list-item">
        <div class="bn-title">{{ m.titulo }}<small>{{ m.editor ?? 'Sin asignar' }}</small></div>
        <span :class="badgeClass(m.dias)">{{ m.dias }} días</span>
      </div>
    </div>

    <div class="section-title">Editores de sección</div>
    <div class="list-card">
      <div v-for="e in cargaEditores" :key="e.nombre" class="list-item">
        <div class="ed-avatar">{{ e.initials }}</div>
        <div class="ed-info">
          <div class="ed-name">{{ e.nombre }}</div>
          <div class="ed-area">{{ e.area }}</div>
        </div>
        <div class="ed-load"><strong>{{ e.activos }}</strong> activos · {{ e.completados }} completados</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const manuscritos = ref([
  { id: 1, titulo: 'Microbioma Intestinal y Trastornos del Espectro Autista', editor: 'Oscar Leonel Rodriguez Araujo', estado: 'en_proceso', lastMove: '2026-02-05' },
  { id: 2, titulo: 'Impacto del Cambio Climático en la Biodiversidad Costera', editor: 'Axel Eduardo Jimenez Perez', estado: 'en_proceso', lastMove: '2026-02-12' },
  { id: 3, titulo: 'Redes Neuronales Cuánticas para Criptografía Post-Cuántica', editor: 'Oscar Leonel Rodriguez Araujo', estado: 'en_proceso', lastMove: '2026-02-18' },
  { id: 4, titulo: 'Políticas de Privacidad Diferencial en Sistemas de Salud', editor: 'Eduardo Hurtado Quintero', estado: 'en_proceso', lastMove: '2026-03-01' },
  { id: 5, titulo: 'Detección de Anomalías en Sistemas SCADA', editor: 'Luis Fernando Prieto Duarte', estado: 'en_proceso', lastMove: '2026-02-22' },
  { id: 9, titulo: 'Síntesis de Nanomateriales Bidimensionales para Energía', editor: 'Luz María Jacobo Aldrete', estado: 'aceptado', lastMove: '2026-03-10' },
  { id: 13, titulo: 'Evaluación de Biomarcadores en Diagnóstico Temprano de Parkinson', editor: 'Ricardo Emmanuel Romo Ruiz', estado: 'rechazado', lastMove: '2026-03-05' },
])

const editores = ref([
  { initials: 'LA', nombre: 'Oscar Leonel Rodriguez Araujo', area: 'Product Owner', completados: 5 },
  { initials: 'AJ', nombre: 'Axel Eduardo Jimenez Perez', area: 'Developer', completados: 3 },
  { initials: 'EQ', nombre: 'Eduardo Hurtado Quintero', area: 'Developer', completados: 3 },
  { initials: 'LP', nombre: 'Luis Fernando Prieto Duarte', area: 'Scrum Master', completados: 6 },
  { initials: 'MA', nombre: 'Luz María Jacobo Aldrete', area: 'Developer', completados: 2 },
  { initials: 'RR', nombre: 'Ricardo Emmanuel Romo Ruiz', area: 'Developer', completados: 2 },
])

function diasSinMovimiento(fecha) {
  return Math.floor((new Date() - new Date(fecha)) / 86400000)
}

const metricas = computed(() => ({
  total: manuscritos.value.length,
  enProceso: manuscritos.value.filter(m => m.estado === 'en_proceso').length,
  aceptados: manuscritos.value.filter(m => m.estado === 'aceptado').length,
  rechazados: manuscritos.value.filter(m => m.estado === 'rechazado').length
}))

const tiempoPromedio = computed(() => {
  const terminados = manuscritos.value.filter(m => ['aceptado', 'rechazado'].includes(m.estado))
  if (!terminados.length) return 0
  const total = terminados.reduce((s, m) => s + diasSinMovimiento(m.lastMove), 0)
  return Math.round(total / terminados.length)
})

const cuellos = computed(() =>
  manuscritos.value
    .filter(m => m.estado === 'en_proceso')
    .map(m => ({ ...m, dias: diasSinMovimiento(m.lastMove) }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 5)
)

const cargaEditores = computed(() =>
  editores.value.map(e => ({
    ...e,
    activos: manuscritos.value.filter(m => m.editor === e.nombre && m.estado === 'en_proceso').length
  }))
)

function badgeClass(dias) {
  if (dias >= 30) return 'bn-badge bn-critical'
  if (dias >= 14) return 'bn-badge bn-warn'
  return 'bn-badge bn-ok'
}
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
.c-blue { color: var(--blue); }
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
.ed-avatar { width: 34px; height: 34px; border-radius: 50%; background: #e0e7ff; color: var(--blue); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ed-info { flex: 1; }
.ed-name { font-size: 14px; font-weight: 500; }
.ed-area { font-size: 11px; color: var(--muted); margin-top: 1px; }
.ed-load { font-size: 13px; color: var(--muted); white-space: nowrap; }
.ed-load strong { color: var(--text); }
</style>
