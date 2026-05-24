<template>
  <div class="suggestions-wrapper">
    <div class="suggestions-header">
      <span class="suggestions-title">✦ Sugerencias automáticas</span>
      <span v-if="source === 'groq'" class="source-badge gemini-badge">✦ Groq AI</span>
      <span v-else-if="source === 'keywords'" class="source-badge keywords-badge">Keywords</span>
    </div>

    <!-- Cargando -->
    <div v-if="loading" class="sug-state loading-container">
      <div class="spinner"></div>
      <div class="loading-text">{{ loadingMsg || 'Analizando compatibilidad...' }}</div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="sug-state sug-error">
      <div class="error-msg">{{ error }}</div>
      <button class="btn-retry" @click="retryFetch">Reintentar</button>
    </div>

    <!-- Sin sugerencias -->
    <div v-else-if="suggestions.length === 0" class="sug-state">
      Sin sugerencias disponibles
    </div>

    <!-- Listado de Sugerencias -->
    <div v-else class="sug-list">
      <div
        v-for="r in suggestions"
        :key="r.id"
        class="sug-item"
        :class="{ 'sug-assigned': isAssigned(r.id), 'sug-conflict-item': r.tieneConflicto }"
      >
        <div class="sug-info">
          <div class="sug-name">{{ r.nombre }}</div>
          <div class="sug-org">{{ r.organizacion }}</div>
            <div v-if="r.tieneConflicto" class="sug-conflict">
              Posible conflicto de interés
            </div>
          <div v-if="r.explanation" class="sug-explanation">
            <strong>Análisis: </strong> {{ r.explanation }}
          </div>
          <div class="sug-tags">
            <span v-for="tag in r.tags" :key="tag" class="tag-chip">{{ tag }}</span>
          </div>
        </div>
        <div class="sug-right">
          <div class="score-badge" :class="scoreTier(r.score)">{{ r.score }}%</div>
          <div v-if="isAssigned(r.id)" class="sug-assigned-label">Ya asignado</div>
          <button
            v-else
            class="btn-assign-sug"
            :class="{ 'btn-assign-warning': r.tieneConflicto }"
            :disabled="assigning === r.id"
            @click="assign(r)"
          >
            {{ assigning === r.id ? '...' : (r.tieneConflicto ? 'Forzar Asignación' : 'Asignar') }}
          </button>
        </div>
      </div>

      <!-- Pie del listado: Acciones y Botón de Gemini -->
      <div class="suggestions-footer">
        <div v-if="source !== 'gemini'" class="gemini-row">
          <span class="gemini-hint">¿Quieres un análisis de compatibilidad detallado?</span>
          <button class="btn-gemini" @click="fetchSuggestionsGemini">
            ✦ Analizar con Groq AI
          </button>
        </div>
        
        <div class="footer-actions">
          <button class="btn-refetch" @click="source === 'groq' ? fetchSuggestionsGemini() : fetchSuggestionsKeywords()">
            ↺ Volver a analizar
          </button>
          
          <button v-if="source === 'groq'" class="keyword-link" @click="fetchSuggestionsKeywords">
            Ver sugerencias rápidas (Keywords)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'

const props = defineProps({
  manuscriptId:       { type: String, required: true },
  manuscriptTitle:    { type: String, default: '' },
  manuscriptAbstract: { type: String, default: '' },
  manuscriptTags:     { type: Array,  default: () => [] },
  assignedReviewers:  { type: Array,  default: () => [] }
})

const emit = defineEmits(['assign'])

const suggestions = ref([])
const loading     = ref(false)
const loadingMsg  = ref('')
const error       = ref('')
const assigning   = ref(null)

const source = computed(() => suggestions.value[0]?.source || null)

// Carga automática de palabras clave al abrir
onMounted(fetchSuggestionsKeywords)
watch(() => props.manuscriptId, fetchSuggestionsKeywords)

async function fetchSuggestionsKeywords() {
  loadingMsg.value = 'Buscando coincidencias por palabras clave...'
  await _fetch('/api/matching/suggestions')
}

async function fetchSuggestionsGemini() {
  loadingMsg.value = 'Analizando compatibilidad con Groq AI...'
  await _fetch('/api/matching/suggestions-groq')
}

async function _fetch(endpoint) {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.post(endpoint, {
      title:        props.manuscriptTitle,
      abstract:     props.manuscriptAbstract,
      tags:         props.manuscriptTags,
      manuscriptId: props.manuscriptId
    })
    suggestions.value = res.data
  } catch (err) {
    console.error('Error fetching suggestions:', err)
    error.value = err.response?.data?.error || 'No se pudieron cargar las sugerencias'
  } finally {
    loading.value = false
  }
}

function retryFetch() {
  if (source.value === 'gemini') {
    fetchSuggestionsGemini()
  } else {
    fetchSuggestionsKeywords()
  }
}

function isAssigned(reviewerId) {
  return props.assignedReviewers?.some(r => r.reviewerId === reviewerId)
}

// Clasificación de la puntuación
function scoreTier(score) {
  if (score >= 60) return 'score-high'
  if (score >= 30) return 'score-mid'
  return 'score-low'
}

async function assign(reviewer) {
  assigning.value = reviewer.id
  emit('assign', reviewer.id, reviewer.tieneConflicto)
  setTimeout(() => { assigning.value = null }, 1500)
}
</script>

<style scoped>
.suggestions-wrapper {
  border: 1.5px solid #e0e7ff;
  border-radius: 12px;
  background: #f8f9ff;
  padding: 14px;
  margin-bottom: 16px;
  font-family: inherit;
}
.suggestions-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.suggestions-title {
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
  flex: 1;
}
.source-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
}
.gemini-badge  { background: #ede9fe; color: #7c3aed; }
.keywords-badge { background: #e0f2fe; color: #0369a1; }

.sug-state  { font-size: 13px; color: var(--muted); text-align: center; padding: 10px 0; }
.sug-error  { color: #dc2626; display: flex; flex-direction: column; align-items: center; gap: 8px; }

.btn-refetch {
  font-size: 11px;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;
}
.btn-refetch:hover {
  background-color: #f3f4f6;
  color: #4f46e5;
}

.sug-list { display: flex; flex-direction: column; gap: 8px; }

.sug-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  background: white;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  transition: transform 0.15s, box-shadow 0.15s;
}
.sug-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}
.sug-item.sug-assigned {
  opacity: 0.65;
  border-color: var(--green);
  background: #f0fdf4;
}

.sug-info     { flex: 1; min-width: 0; }
.sug-name     { font-size: 13px; font-weight: 500; }
.sug-org      { font-size: 11px; color: var(--muted); margin-bottom: 4px; }
.sug-explanation {
  font-size: 11px;
  color: #4b5563;
  font-style: italic;
  margin-top: 6px;
  margin-bottom: 6px;
  line-height: 1.4;
  padding: 6px 8px;
  background: #f5f3ff;
  border-left: 2.5px solid #8b5cf6;
  border-radius: 4px;
}
.sug-tags     { display: flex; flex-wrap: wrap; gap: 3px; }
.tag-chip     { font-size: 10px; padding: 2px 7px; background: var(--light); border-radius: 100px; color: var(--muted); }

.sug-right    { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; }

.score-badge  { font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 100px; white-space: nowrap; }
.score-high   { background: #dcfce7; color: #16a34a; }
.score-mid    { background: #fef9c3; color: #ca8a04; }
.score-low    { background: #fee2e2; color: #dc2626; }

.sug-assigned-label { font-size: 10px; color: var(--green); font-weight: 600; }

.btn-assign-sug {
  font-size: 11px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 8px;
  border: none;
  background: #4f46e5;
  color: white;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s;
}
.btn-assign-sug:hover:not(:disabled) { background: #4338ca; }
.btn-assign-sug:disabled { opacity: 0.6; cursor: not-allowed; }

/* Fila de Gemini al pie de las sugerencias por palabras clave */
.gemini-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
  padding: 10px;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 8px;
}
.gemini-hint { font-size: 11px; color: #6b7280; font-weight: 500; }
.btn-gemini {
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: white;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(124,58,237,0.2);
  transition: opacity 0.2s;
  white-space: nowrap;
}
.btn-gemini:hover { opacity: 0.9; }

.suggestions-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
}
.footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.keyword-link {
  font-size: 11px;
  color: #4b5563;
  text-decoration: underline;
  cursor: pointer;
  background: none;
  border: none;
  padding: 4px;
}
.keyword-link:hover {
  color: #4f46e5;
}

/* Spinner y estilos de carga */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 0;
}
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e0e7ff;
  border-top: 3px solid #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.loading-text {
  font-weight: 500;
  color: #4f46e5;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-retry {
  font-size: 11px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  cursor: pointer;
  margin-top: 6px;
  transition: background-color 0.2s;
}
.btn-retry:hover {
  background-color: #f3f4f6;
}
.error-msg {
  color: #dc2626;
  font-weight: 500;
}

.sug-conflict {
  font-size: 11px;
  color: #dc2626;
  background: #fee2e2;
  padding: 3px 6px;
  border-radius: 4px;
  font-weight: 600;
  display: inline-block;
  margin-bottom: 4px;
}

/* NUEVO: Estilos para el conflicto de interés */
.sug-conflict-item {
  border-left: 4px solid #dc2626;
  background-color: #fff5f5;
}
.btn-assign-warning {
  background-color: #ef4444;
}
.btn-assign-warning:hover:not(:disabled) {
  background-color: #dc2626;
}
</style>
