<template>
  <div class="se-container">
    <h1 class="se-title">Panel del Editor de Sección</h1>
    <div class="counters-grid">
      <div class="counter-card"><div class="counter-label">En proceso</div><div class="counter-value c-yellow">{{ contadores.enProceso }}</div></div>
      <div class="counter-card"><div class="counter-label">Pendientes de decisión</div><div class="counter-value c-orange">{{ contadores.pendientesDecision }}</div></div>
      <div class="counter-card"><div class="counter-label">Listos para decidir</div><div class="counter-value c-green">{{ contadores.listosDecidir }}</div></div>
    </div>

    <div class="section-title">Mis manuscritos</div>
    <div class="list-card">
      <div v-for="m in manuscritos" :key="m.id" class="ms-item" :class="alertClass(m)">
        <div class="ms-main">
          <div class="ms-title">{{ m.titulo }}</div>
          <div class="ms-meta">
            <span>{{ estadoLabel(m.estado) }}</span>
            <span class="dot">·</span>
            <span>Revisores: {{ m.revisores_asignados }}/{{ m.revisores_requeridos }}</span>
            <span class="dot">·</span>
            <span>Último mov. {{ fmtDate(m.ultimo_movimiento) }}</span>
          </div>
        </div>
        <button class="btn-asignar" @click="abrirModal(m)">+ Asignar revisor</button>
      </div>
    </div>

    <BaseModal
      :is-open="modalAbierto"
      title="Asignar revisor"
      :subtitle="manuscritoActivo?.titulo"
      submit-label="Confirmar"
      :can-submit="!!revisorSeleccionado"
      @close="cerrarModal"
      @submit="confirmarAsignacion"
    >
      <div v-for="r in revisores" :key="r.id" class="revisor-item" :class="{ selected: revisorSeleccionado === r.id }" @click="revisorSeleccionado = r.id">
        <div class="ed-avatar">{{ r.initials }}</div>
        <div class="ed-info">
          <div class="ed-name">{{ r.nombre }}</div>
          <div class="ed-area">{{ r.area }}</div>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '@/shared/stores/appStore'
import BaseModal from '@/shared/components/BaseModal.vue'

const store = useAppStore()

const manuscritos = ref([
  { id: 1, titulo: 'Redes Neuronales Cuánticas para Criptografía Post-Cuántica', estado: 'en_proceso', revisores_asignados: 1, revisores_requeridos: 3, ultimo_movimiento: '2026-02-18', revision_vencida: false },
  { id: 2, titulo: 'Detección de Anomalías en Sistemas SCADA', estado: 'listo_decidir', revisores_asignados: 3, revisores_requeridos: 3, ultimo_movimiento: '2026-03-15', revision_vencida: false },
  { id: 3, titulo: 'Políticas de Privacidad Diferencial en Sistemas de Salud', estado: 'en_proceso', revisores_asignados: 1, revisores_requeridos: 3, ultimo_movimiento: '2026-03-01', revision_vencida: false },
  { id: 4, titulo: 'Arquitecturas Transformer para Series Temporales en Finanzas', estado: 'en_proceso', revisores_asignados: 0, revisores_requeridos: 2, ultimo_movimiento: '2026-03-19', revision_vencida: false },
  { id: 5, titulo: 'Microbioma Intestinal y Trastornos del Espectro Autista', estado: 'en_proceso', revisores_asignados: 2, revisores_requeridos: 3, ultimo_movimiento: '2026-02-20', revision_vencida: true },
])

const revisores = ref([
  { id: 1, nombre: 'Oscar Leonel Rodriguez Araujo', area: 'Product Owner', initials: 'LA' },
  { id: 2, nombre: 'Axel Eduardo Jimenez Perez', area: 'Developer', initials: 'AJ' },
  { id: 3, nombre: 'Eduardo Hurtado Quintero', area: 'Developer', initials: 'EQ' },
  { id: 4, nombre: 'Luis Fernando Prieto Duarte', area: 'Scrum Master', initials: 'LP' },
  { id: 5, nombre: 'Luz María Jacobo Aldrete', area: 'Developer', initials: 'MA' },
  { id: 6, nombre: 'Ricardo Emmanuel Romo Ruiz', area: 'Developer', initials: 'RR' },
])

const modalAbierto = ref(false)
const manuscritoActivo = ref(null)
const revisorSeleccionado = ref(null)

function abrirModal(m) {
  manuscritoActivo.value = m
  revisorSeleccionado.value = null
  modalAbierto.value = true
}

function cerrarModal() {
  modalAbierto.value = false
  manuscritoActivo.value = null
  revisorSeleccionado.value = null
}

function confirmarAsignacion() {
  if (!revisorSeleccionado.value || !manuscritoActivo.value) return
  const m = manuscritos.value.find(m => m.id === manuscritoActivo.value.id)
  if (m) {
    m.revisores_asignados = Math.min(m.revisores_asignados + 1, m.revisores_requeridos)
    store.pushToast('Revisor asignado correctamente')
  }
  cerrarModal()
}

const contadores = computed(() => ({
  enProceso: manuscritos.value.filter(m => m.estado === 'en_proceso').length,
  pendientesDecision: manuscritos.value.filter(m => m.estado === 'pendiente_decision').length,
  listosDecidir: manuscritos.value.filter(m => m.estado === 'listo_decidir').length
}))

function alertClass(m) {
  if (m.revisores_asignados === 0) return 'alert-sin-revisor'
  if (m.revision_vencida) return 'alert-vencido'
  if (m.estado === 'listo_decidir') return 'alert-listo'
  return ''
}

function estadoLabel(estado) {
  return {
    en_proceso: 'En proceso',
    pendiente_decision: 'Pendiente de decisión',
    listo_decidir: 'Listo para decidir'
  }[estado] ?? estado
}

function fmtDate(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.se-container { max-width: 680px; margin: 0 auto; }
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
.ms-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--light); border-left: 3px solid transparent; cursor: pointer; }
.ms-item:last-child { border-bottom: none; }
.alert-sin-revisor { border-left-color: #a78bfa; background: #faf5ff; }
.alert-vencido { border-left-color: var(--red); background: var(--red-soft); }
.alert-listo { border-left-color: var(--green); background: var(--green-soft); }
.ms-main { flex: 1; min-width: 0; }
.ms-title { font-size: 14px; font-weight: 500; line-height: 1.3; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms-meta { font-size: 12px; color: var(--muted); display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.dot { color: #ccc; }
.btn-asignar { flex-shrink: 0; font-size: 12px; font-weight: 500; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: white; white-space: nowrap; }
.btn-asignar:hover { background: var(--light); }
.revisor-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; cursor: pointer; margin-bottom: 8px; border: 2px solid transparent; transition: all .15s; }
.revisor-item:hover { background: var(--light); }
.revisor-item.selected { border-color: var(--blue); background: var(--blue-soft); }
.ed-avatar { width: 34px; height: 34px; border-radius: 50%; background: #e0e7ff; color: var(--blue); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ed-info { flex: 1; }
.ed-name { font-size: 14px; font-weight: 500; }
.ed-area { font-size: 11px; color: var(--muted); margin-top: 1px; }
</style>
