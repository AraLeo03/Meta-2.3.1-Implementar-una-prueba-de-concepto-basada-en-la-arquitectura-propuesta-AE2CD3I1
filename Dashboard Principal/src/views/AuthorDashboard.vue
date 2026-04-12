<template>
  <div class="wrap">
    <div class="brand">Dashboard del autor</div>
    <button class="btn-new" @click="showNewModal = true">+ Enviar nuevo manuscrito</button>
    <div class="section-label">Mis manuscritos</div>
    <div v-if="manuscripts.length === 0" class="empty">
      <div class="empty-title">Aún no tienes manuscritos enviados</div>
      <div class="empty-sub">Usa el botón de arriba para agregar tu primer trabajo.</div>
    </div>
    <div v-else class="ms-list">
      <TransitionGroup name="list">
        <div v-for="ms in manuscripts" :key="ms.id" class="ms-row">
          <div class="ms-info">
            <div class="ms-title">{{ ms.title }}</div>
            <div class="ms-date">{{ ms.date }}</div>
          </div>
          <span class="badge" :class="badgeClass(ms.status)">{{ ms.status }}</span>
          <button class="btn-delete" @click="removeManuscript(ms.id)">✕</button>
        </div>
      </TransitionGroup>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showNewModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal">
            <div class="modal-header">
              <h2>Nuevo manuscrito</h2>
              <p>Completa los campos para agregar el manuscrito a tu colección</p>
            </div>
            <form @submit.prevent="submit" class="modal-form">
              <div class="form-group">
                <label for="title">Título del manuscrito</label>
                <input 
                  id="title"
                  v-model="form.title" 
                  type="text" 
                  placeholder="Ej: Redes Neuronales para Detección de Patrones"
                  autocomplete="off"
                />
              </div>
              <div class="form-group">
                <label for="status">Estado de revisión</label>
                <div class="select-wrapper">
                  <select id="status" v-model="form.status">
                    <option value="" disabled>Seleccionar estado…</option>
                    <option value="Enviado">📤 Enviado</option>
                    <option value="En revisión">🔄 En revisión</option>
                    <option value="Decisión">📋 Decisión</option>
                    <option value="Aceptado">✅ Aceptado</option>
                    <option value="Rechazado">❌ Rechazado</option>
                  </select>
                  <svg class="select-arrow" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
              <div class="form-group">
                <label for="date">Fecha de envío</label>
                <input 
                  id="date"
                  v-model="form.date" 
                  type="date"
                />
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" @click="closeModal">Cancelar</button>
                <button type="submit" class="btn-submit" :disabled="!canSubmit">
                  <span>📄</span> Agregar manuscrito
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useAppStore } from '@/shared/stores/appStore'

const store = useAppStore()
const manuscripts = ref([
  { id: 1, title: 'Prueba de artículo enviado', date: '01/04/2025', status: 'Enviado' },
  { id: 2, title: 'Prueba de artículo en revisión', date: '15/03/2025', status: 'En revisión' },
  { id: 3, title: 'Prueba de artículo en decisión', date: '02/02/2025', status: 'Decisión' },
  { id: 4, title: 'Prueba de artículo aceptado', date: '18/01/2025', status: 'Aceptado' },
  { id: 5, title: 'Prueba de artículo rechazado', date: '05/12/2024', status: 'Rechazado' },
])
const showNewModal = ref(false)
const form = reactive({ title: '', status: '', date: '' })
const canSubmit = computed(() => form.title.trim() && form.status && form.date)

function addManuscript(title, status, date) {
  manuscripts.value.unshift({ id: Date.now(), title, status, date })
  store.pushToast('Manuscrito agregado')
}

function removeManuscript(id) {
  manuscripts.value = manuscripts.value.filter(m => m.id !== id)
  store.pushToast('Manuscrito eliminado')
}

function closeModal() {
  showNewModal.value = false
  form.title = ''
  form.status = ''
  form.date = ''
}

function submit() {
  if (!canSubmit.value) return
  const [y, m, d] = form.date.split('-')
  addManuscript(form.title.trim(), form.status, `${d}/${m}/${y}`)
  closeModal()
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

/* Modal Styles */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
.modal { background: var(--white); border-radius: 16px; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden; }
.modal-header { padding: 24px 24px 0; text-align: center; }
.modal-header h2 { font-size: 20px; font-weight: 600; color: var(--text); margin: 0 0 6px; }
.modal-header p { font-size: 13px; color: var(--muted); margin: 0; }
.modal-form { padding: 20px 24px 24px; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 8px; }
.form-group input, .form-group select { width: 100%; border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 14px; color: var(--text); background: var(--white); transition: all .2s; outline: none; }
.form-group input::placeholder { color: #b0b0b0; }
.form-group input:focus, .form-group select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
.select-wrapper { position: relative; }
.select-wrapper select { appearance: none; padding-right: 40px; cursor: pointer; }
.select-arrow { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: var(--muted); pointer-events: none; }
.modal-actions { display: flex; gap: 10px; margin-top: 24px; }
.btn-cancel { flex: 1; padding: 12px 20px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--white); font-size: 14px; font-weight: 500; color: var(--muted); cursor: pointer; transition: all .2s; }
.btn-cancel:hover { background: var(--light); color: var(--text); }
.btn-submit { flex: 2; padding: 12px 20px; border: none; border-radius: 10px; background: var(--blue); font-size: 14px; font-weight: 500; color: white; cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn-submit:hover:not([disabled]) { background: var(--blue-hover); transform: translateY(-1px); }
.btn-submit[disabled] { opacity: 0.5; cursor: not-allowed; transform: none; }
</style>
