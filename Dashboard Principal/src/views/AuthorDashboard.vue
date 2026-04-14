<template>
  <div class="wrap">
    <div class="brand">Dashboard del autor</div>
    <button class="btn-new" @click="showNewModal = true">+ Enviar nuevo manuscrito</button>
    <div class="section-label">Mis manuscritos</div>
    <div v-if="loading" class="empty">
      <div class="empty-title">Cargando manuscritos...</div>
    </div>
    <div v-else-if="manuscripts.length === 0" class="empty">
      <div class="empty-title">Aún no tienes manuscritos enviados</div>
      <div class="empty-sub">Usa el botón de arriba para agregar tu primer trabajo.</div>
    </div>
    <div v-else class="ms-list">
      <TransitionGroup name="list">
        <div v-for="ms in manuscripts" :key="ms.id" class="ms-row" @click="openDetailModal(ms)">
          <div class="ms-info">
            <div class="ms-title">{{ ms.title }}</div>
            <div class="ms-date">{{ ms.date }}</div>
          </div>
          <span class="badge" :class="badgeClass(ms.status)">{{ ms.status }}</span>
        </div>
      </TransitionGroup>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showNewModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal">
            <div class="modal-header">
              <h2>Nuevo manuscrito</h2>
              <p>Sube tu manuscrito en PDF y completa los datos</p>
            </div>
            <form @submit.prevent="submit" class="modal-form" enctype="multipart/form-data">
              <div class="form-group">
                <label for="title">Título del manuscrito</label>
                <input 
                  id="title"
                  v-model="form.title" 
                  type="text" 
                  placeholder="Ej: Redes Neuronales para Detección de Patrones"
                  autocomplete="off"
                  required
                />
              </div>
              
              <div class="form-group">
                <label>Autores</label>
                <div v-for="(author, index) in form.authors" :key="index" class="author-row">
                  <input 
                    v-model="author.name" 
                    type="text" 
                    placeholder="Nombre completo"
                    required
                  />
                  <input 
                    v-model="author.email" 
                    type="email" 
                    placeholder="Email"
                    required
                  />
                  <input 
                    v-model="author.affiliation" 
                    type="text" 
                    placeholder="Institución"
                  />
                  <button v-if="form.authors.length > 1" type="button" class="btn-remove-author" @click="removeAuthor(index)">✕</button>
                </div>
                <button type="button" class="btn-add-author" @click="addAuthor">+ Agregar autor</button>
              </div>

              <div class="form-group">
                <label for="description">Descripción</label>
                <textarea 
                  id="description"
                  v-model="form.description" 
                  placeholder="Resumen del manuscrito..."
                  rows="3"
                ></textarea>
              </div>

              <div class="form-group">
                <label for="tags">Etiquetas (temas)</label>
                <input 
                  id="tags"
                  v-model="tagsInput" 
                  type="text" 
                  placeholder="Ej: Machine Learning, Física, Psicología (separados por coma)"
                />
              </div>

              <div class="form-group">
                <label for="pdf">Archivo PDF</label>
                <div class="file-input-wrap">
                  <input 
                    id="pdf"
                    type="file" 
                    accept=".pdf"
                    @change="handleFileChange"
                    required
                  />
                  <span v-if="form.pdf" class="file-name">{{ form.pdf.name }}</span>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" @click="closeModal">Cancelar</button>
                <button type="submit" class="btn-submit" :disabled="!canSubmit || submitting">
                  <span v-if="submitting">⏳ Enviando...</span>
                  <span v-else>📄 Enviar manuscrito</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
          <div class="modal">
            <div class="modal-header">
              <h2>{{ selectedManuscript?.title }}</h2>
              <p class="detail-status" :class="badgeClass(selectedManuscript?.status)">{{ selectedManuscript?.status }}</p>
            </div>
            <div class="modal-body">
              <div class="detail-section">
                <label>Autores</label>
                <div class="detail-text">{{ selectedManuscript?.authors.map(a => a.name).join(', ') }}</div>
              </div>
              <div v-if="selectedManuscript?.description" class="detail-section">
                <label>Descripción</label>
                <div class="detail-text">{{ selectedManuscript.description }}</div>
              </div>
              <div v-if="selectedManuscript?.tags?.length" class="detail-section">
                <label>Temas</label>
                <div class="detail-tags">
                  <span v-for="tag in selectedManuscript.tags" :key="tag" class="tag-chip">{{ tag }}</span>
                </div>
              </div>
              <div class="detail-section">
                <label>Fecha de envío</label>
                <div class="detail-text">{{ selectedManuscript?.date }}</div>
              </div>
            </div>
            <div class="modal-actions">
              <a :href="'/api/manuscripts/' + selectedManuscript?.id + '/view'" target="_blank" class="btn-read">📖 Leer</a>
              <a :href="'/api/manuscripts/' + selectedManuscript?.id + '/download'" target="_blank" class="btn-download">⬇ Descargar</a>
              <button class="btn-delete-modal" @click="confirmDelete">🗑 Eliminar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
          <div class="modal confirm-modal">
            <div class="modal-header">
              <h2>Confirmar eliminación</h2>
              <p>¿Estás seguro de que deseas eliminar este manuscrito? Esta acción no se puede deshacer.</p>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" @click="showConfirmModal = false">Cancelar</button>
              <button class="btn-delete-confirm" @click="removeManuscript">Eliminar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'
import { useAppStore } from '@/shared/stores/appStore'
import { useAuthStore } from '@/shared/stores/authStore'

const store = useAppStore()
const authStore = useAuthStore()
const API_URL = '/api/manuscripts'

const manuscripts = ref([])
const loading = ref(true)
const showNewModal = ref(false)
const showDetailModal = ref(false)
const showConfirmModal = ref(false)
const selectedManuscript = ref(null)
const submitting = ref(false)
const tagsInput = ref('')

const form = reactive({ 
  title: '', 
  description: '',
  pdf: null,
  authors: [{ name: '', email: '', affiliation: '' }]
})

const canSubmit = computed(() => {
  return form.title.trim() && 
    form.authors.length > 0 && 
    form.authors.every(a => a.name.trim() && a.email.trim()) &&
    form.pdf
})

onMounted(async () => {
  await fetchManuscripts()
})

async function fetchManuscripts() {
  loading.value = true
  try {
    const authorId = authStore.user?.id
    if (!authorId) {
      manuscripts.value = []
      return
    }
    const res = await axios.get(`${API_URL}?authorId=${authorId}`)
    manuscripts.value = res.data
  } catch (err) {
    console.error('Error fetching manuscripts:', err)
    store.pushToast('Error al cargar manuscritos')
  } finally {
    loading.value = false
  }
}

function addAuthor() {
  form.authors.push({ name: '', email: '', affiliation: '' })
}

function removeAuthor(index) {
  form.authors.splice(index, 1)
}

function handleFileChange(event) {
  const file = event.target.files[0]
  if (file && file.type === 'application/pdf') {
    form.pdf = file
  } else {
    store.pushToast('Solo se permiten archivos PDF')
    form.pdf = null
  }
}

async function submit() {
  if (!canSubmit.value || submitting.value) return
  
  submitting.value = true
  try {
    const formData = new FormData()
    formData.append('title', form.title)
    formData.append('authors', JSON.stringify(form.authors))
    formData.append('description', form.description)
    formData.append('tags', JSON.stringify(tagsInput.value.split(',').map(t => t.trim()).filter(t => t)))
    formData.append('pdf', form.pdf)

    const res = await axios.post(API_URL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    manuscripts.value.unshift(res.data)
    store.pushToast('Manuscrito enviado correctamente')
    closeModal()
  } catch (err) {
    console.error('Error submitting manuscript:', err)
    store.pushToast('Error al enviar manuscrito')
  } finally {
    submitting.value = false
  }
}

async function removeManuscript() {
  if (!selectedManuscript.value) return
  try {
    await axios.delete(`${API_URL}/${selectedManuscript.value.id}`)
    manuscripts.value = manuscripts.value.filter(m => m.id !== selectedManuscript.value.id)
    store.pushToast('Manuscrito eliminado')
    closeDetailModal()
    showConfirmModal.value = false
  } catch (err) {
    console.error('Error deleting manuscript:', err)
    store.pushToast('Error al eliminar manuscrito')
  }
}

function openDetailModal(ms) {
  selectedManuscript.value = ms
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  selectedManuscript.value = null
}

function confirmDelete() {
  showConfirmModal.value = true
}

function closeModal() {
  showNewModal.value = false
  form.title = ''
  form.description = ''
  form.pdf = null
  form.authors = [{ name: '', email: '', affiliation: '' }]
  tagsInput.value = ''
}

function badgeClass(s) {
  return {
    'Enviado': 'b-enviado',
    'En revisión': 'b-revision',
    'Decisión': 'b-decision',
    'Aceptado': 'b-aceptado',
    'Rechazado': 'b-rechazado'
  }[s] || 'b-enviado'
}
</script>

<style scoped>
.wrap { max-width: 660px; margin: 0 auto; }
.brand { font-size: 18px; font-weight: 600; margin-bottom: 28px; }
.btn-new { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 11px 20px; background: var(--blue); color: #fff; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 500; margin-bottom: 32px; transition: opacity .15s; }
.btn-new:hover { opacity: .87; }
.section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: 10px; }
.ms-list { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--white); margin-bottom: 28px; }
.ms-row { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--border); }
.ms-row:last-child { border-bottom: none; }
.ms-row:hover { background: var(--light); }
.ms-info { flex: 1; min-width: 0; }
.ms-title { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
.ms-date { font-size: 12px; color: var(--muted); }
.badge { font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 100px; white-space: nowrap; flex-shrink: 0; }
.b-enviado   { background: #eff6ff; color: #1d4ed8; }
.b-revision  { background: #fef9c3; color: #a16207; }
.b-decision  { background: #fff7ed; color: #c2410c; }
.b-aceptado  { background: #f0fdf4; color: #15803d; }
.b-rechazado { background: #fff1f2; color: #be123c; }
.btn-delete { background: none; border: none; padding: 4px; color: #d1d5db; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: color .15s, background .15s; }
.btn-delete:hover { color: #ef4444; background: #fff1f2; }
.empty { border: 1px dashed var(--border); border-radius: var(--radius); background: var(--white); padding: 52px 24px; text-align: center; margin-bottom: 28px; }
.empty-title { font-size: 15px; font-weight: 500; margin-bottom: 6px; }
.empty-sub { font-size: 13px; color: var(--muted); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
.modal { background: var(--white); border-radius: 16px; width: 100%; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden; }
.modal-header { padding: 24px 24px 0; text-align: center; }
.modal-header h2 { font-size: 20px; font-weight: 600; color: var(--text); margin: 0 0 6px; }
.modal-header p { font-size: 13px; color: var(--muted); margin: 0; }
.modal-form { padding: 20px 24px 24px; max-height: 70vh; overflow-y: auto; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 8px; }
.form-group input, .form-group select, .form-group textarea { width: 100%; border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 14px; color: var(--text); background: var(--white); transition: all .2s; outline: none; }
.form-group input::placeholder, .form-group textarea::placeholder { color: #b0b0b0; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
.form-group textarea { resize: vertical; }

.author-row { display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 8px; margin-bottom: 8px; }
.author-row input { width: 100%; }
.btn-remove-author { background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 14px; }
.btn-add-author { background: none; border: 1.5px dashed var(--border); border-radius: 8px; padding: 8px 16px; width: 100%; font-size: 13px; color: var(--muted); cursor: pointer; }
.btn-add-author:hover { border-color: var(--blue); color: var(--blue); }

.file-input-wrap { border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 14px; }
.file-input-wrap input { border: none; padding: 0; }
.file-name { display: block; margin-top: 8px; font-size: 12px; color: var(--blue); }

.modal-actions { display: flex; gap: 10px; margin-top: 24px; }
.btn-cancel { flex: 1; padding: 12px 20px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--white); font-size: 14px; font-weight: 500; color: var(--muted); cursor: pointer; transition: all .2s; }
.btn-cancel:hover { background: var(--light); color: var(--text); }
.btn-submit { flex: 2; padding: 12px 20px; border: none; border-radius: 10px; background: var(--blue); font-size: 14px; font-weight: 500; color: white; cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn-submit:hover:not([disabled]) { background: var(--blue-hover); transform: translateY(-1px); }
.btn-submit[disabled] { opacity: 0.5; cursor: not-allowed; transform: none; }

.ms-row { cursor: pointer; }

.detail-status { display: inline-block; margin-top: 4px; padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 500; }
.detail-section { margin-bottom: 16px; }
.detail-section label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 6px; }
.detail-text { font-size: 14px; color: var(--text); line-height: 1.5; }
.detail-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-chip { font-size: 11px; padding: 4px 10px; background: var(--light); border-radius: 100px; color: var(--muted); }

.modal-body { padding: 16px 24px; }
.modal-actions { display: flex; gap: 8px; padding: 16px 24px 24px; }
.btn-read, .btn-download, .btn-delete-modal { flex: 1; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-weight: 500; text-align: center; text-decoration: none; cursor: pointer; border: none; }
.btn-read { background: #eff6ff; color: #1d4ed8; }
.btn-read:hover { background: #dbeafe; }
.btn-download { background: #f0fdf4; color: #15803d; }
.btn-download:hover { background: #dcfce7; }
.btn-delete-modal { background: #fef2f2; color: #dc2626; }
.btn-delete-modal:hover { background: #fee2e2; }

.confirm-modal { max-width: 400px; }
.btn-delete-confirm { flex: 1; padding: 12px 20px; border: none; border-radius: 10px; background: #dc2626; font-size: 14px; font-weight: 500; color: white; cursor: pointer; }
.btn-delete-confirm:hover { background: #b91c1c; }
</style>