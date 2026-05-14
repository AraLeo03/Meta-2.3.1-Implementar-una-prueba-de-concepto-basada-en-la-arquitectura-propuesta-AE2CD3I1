<template>
  <div class="admin-container">
    <h1 class="admin-title">Panel del Administrador</h1>
    <div v-if="loading" class="loading">Cargando...</div>
    <template v-else>
      <div class="stats-grid">
        <div class="stat-card" @click="showOptionsModal = true" style="cursor:pointer">
          <div class="stat-value">{{ stats.usuarios }}</div>
          <div class="stat-label">Usuarios</div>
        </div>
        <div class="stat-card"><div class="stat-value">{{ stats.articulos }}</div><div class="stat-label">Artículos</div></div>
        <div class="stat-card"><div class="stat-value">{{ stats.revisiones }}</div><div class="stat-label">Revisiones</div></div>
        <div class="stat-card"><div class="stat-value">{{ stats.revisores }}</div><div class="stat-label">Revisores</div></div>
      </div>

      <div class="admin-section">
        <div class="admin-section-header">Manuscritos</div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Estado</th>
              <th>Revisores</th>
              <th>Fecha envío</th>
              <th>Fecha límite</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in manuscritos" :key="m.id" class="manuscript-row" @click="openManuscriptDetailModal(m)">
              <td><strong>{{ m.title }}</strong></td>
              <td><span class="role-badge" :class="statusClass(m.status)">{{ m.status }}</span></td>
              <td>
                <div v-if="m.reviewers && m.reviewers.length > 0" class="reviewers-cell">
                  <div v-for="rev in m.reviewers" :key="rev.reviewerId" class="reviewer-row" @click.stop>
                    <span class="reviewer-name">{{ rev.reviewerName || 'Revisor' }}</span>
                    <span class="reviewer-status" :class="rev.status">{{ formatStatus(rev.status) }}</span>
                    <span class="reviewer-days" :class="{ 'days-warning': getDaysLeft(rev) < 7 }">
                      {{ getDaysLeft(rev) }} días
                    </span>
                  </div>
                </div>
                <span v-else class="no-reviewers">Sin revisores</span>
              </td>
              <td style="color:var(--muted)">{{ m.date }}</td>
              <td style="color:var(--muted)">{{ formatDeadline(m) }}</td>
              <td @click.stop>
                <button class="btn-action" @click="openEditDeadlineModal(m)">⏱ Editar plazo</button>
              </td>
            </tr>
            <tr v-if="manuscritos.length === 0">
              <td colspan="6" style="text-align:center;color:var(--muted)">No hay manuscritos</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ── Confirmar eliminar revisor ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showRemoveModal" class="modal-overlay" @click.self="closeRemoveModal">
          <div class="modal confirm-modal">
            <div class="modal-header">
              <h2>Eliminar revisor</h2>
              <p>¿Estás seguro de que deseas eliminar a <strong>{{ selectedReviewer?.reviewerName }}</strong> del manuscrito <strong>{{ selectedManuscript?.title }}</strong>?</p>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" @click="closeRemoveModal">Cancelar</button>
              <button class="btn-delete-confirm" @click="removeReviewer">Eliminar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Editar plazo ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDeadlineModal" class="modal-overlay" @click.self="closeDeadlineModal">
          <div class="modal">
            <div class="modal-header">
              <h2>Editar plazo de revisión</h2>
              <p>{{ selectedManuscript?.title }}</p>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Nuevo plazo (días)</label>
                <input v-model.number="newDeadline" type="number" min="1" max="90" />
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" @click="closeDeadlineModal">Cancelar</button>
              <button class="btn-submit" @click="updateDeadline">Guardar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Detalle de manuscrito ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showManuscriptDetailModal" class="modal-overlay" @click.self="closeManuscriptDetailModal">
          <div class="modal detail-modal">
            <div class="modal-header">
              <h2>{{ selectedManuscript?.title }}</h2>
              <button class="btn-close" @click="closeManuscriptDetailModal">✕</button>
            </div>
            <div class="modal-body scrollable">
              <div class="detail-section">
                <label>Estado</label>
                <span class="role-badge" :class="statusClass(selectedManuscript?.status)">{{ selectedManuscript?.status }}</span>
              </div>
              <div class="detail-section">
                <label>Fecha de envío</label>
                <div class="detail-text">{{ selectedManuscript?.date }}</div>
              </div>

              <!-- ── #2755 Verificación de autores registrados ── -->
              <div class="detail-section">
                <label>Autores</label>
                <div v-if="verifyingAuthors" class="authors-loading">Verificando registros...</div>
                <div v-else class="authors-list">
                  <div
                    v-for="a in authorVerification"
                    :key="a.name"
                    class="author-row"
                    :class="a.registered ? 'author-ok' : 'author-missing'"
                  >
                    <span class="author-icon">{{ a.registered ? '✓' : '!' }}</span>
                    <span class="author-name">{{ a.name }}</span>
                    <span class="author-status-label">{{ a.registered ? 'Registrado' : 'No registrado' }}</span>
                  </div>
                </div>
              </div>
              <!-- ─────────────────────────────────────────────── -->

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
                <label>Revisores</label>
                <div v-if="selectedManuscript?.reviewers?.length > 0" class="reviewers-list">
                  <div v-for="rev in selectedManuscript.reviewers" :key="rev.reviewerId" class="reviewer-item">
                    <div class="reviewer-info">
                      <span class="reviewer-name">{{ rev.reviewerName || 'Revisor' }}</span>
                      <span class="reviewer-status" :class="rev.status">{{ formatStatus(rev.status) }}</span>
                      <span class="reviewer-days" :class="{ 'days-warning': getDaysLeft(rev) < 7 }">
                        {{ getDaysLeft(rev) }} días restantes
                      </span>
                    </div>
                    <button class="btn-remove" @click="openRemoveModalFromDetail(rev)">🗑</button>
                  </div>
                </div>
                <span v-else class="no-reviewers">Sin revisores asignados</span>
              </div>
              <div class="detail-section">
                <label>Plazo de revisión</label>
                <div class="deadline-edit">
                  <input v-model.number="newDeadline" type="number" min="1" max="90" />
                  <button class="btn-submit-small" @click="updateDeadlineFromDetail">Guardar plazo</button>
                </div>
              </div>
              <div class="detail-actions">
                <a :href="'/api/manuscripts/' + selectedManuscript?.id + '/download'" target="_blank" class="btn-view-pdf">📖 Ver PDF</a>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Opciones de gestión ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showOptionsModal" class="modal-overlay" @click.self="showOptionsModal = false">
          <div class="modal options-modal">
            <div class="modal-header">
              <h2>Gestión</h2>
              <button class="btn-close" @click="showOptionsModal = false">✕</button>
            </div>
            <div class="modal-body options-body">
              <div class="option-card" @click="openUsersModal">
                <div class="option-icon">👥</div>
                <div class="option-text">
                  <div class="option-title">Usuarios</div>
                  <div class="option-desc">Ver y modificar información de usuarios</div>
                </div>
              </div>
              <div class="option-card" @click="openManuscriptsModal">
                <div class="option-icon">📄</div>
                <div class="option-text">
                  <div class="option-title">Manuscritos</div>
                  <div class="option-desc">Administrar revisores y plazos de revisión</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Lista de usuarios ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showUsersModal" class="modal-overlay" @click.self="showUsersModal = false">
          <div class="modal users-modal">
            <div class="modal-header">
              <h2>Usuarios</h2>
              <button class="btn-close" @click="showUsersModal = false">✕</button>
            </div>
            <div class="modal-body scrollable">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Roles</th>
                    <th>Organización</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in usuarios" :key="u.id">
                    <td>{{ u.nombre }}</td>
                    <td>{{ u.email }}</td>
                    <!-- Muestra un badge por cada rol del usuario -->
                    <td>
                      <div class="roles-cell">
                        <span
                          v-for="rol in (u.roles || [u.rol])"
                          :key="rol"
                          class="role-badge"
                          :class="roleClass(rol)"
                        >{{ formatRole(rol) }}</span>
                      </div>
                    </td>
                    <td>{{ u.organizacion }}</td>
                    <td><button class="btn-action" @click="openEditUserModal(u)">✏ Editar</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Editar usuario (#2758 multi-rol) ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showEditUserModal" class="modal-overlay" @click.self="closeEditUserModal">
          <div class="modal">
            <div class="modal-header">
              <h2>Editar usuario</h2>
            </div>
            <div class="modal-body scrollable">
              <div class="form-group">
                <label>Nombre</label>
                <input v-model="editUserForm.nombres" type="text" />
              </div>
              <div class="form-group">
                <label>Apellido Paterno</label>
                <input v-model="editUserForm.apellido_paterno" type="text" />
              </div>
              <div class="form-group">
                <label>Apellido Materno</label>
                <input v-model="editUserForm.apellido_materno" type="text" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input v-model="editUserForm.email" type="email" />
              </div>
              <div class="form-group">
                <label>Organización</label>
                <input v-model="editUserForm.organizacion" type="text" />
              </div>

              <!-- ── #2758 Roles como checkboxes ── -->
              <div class="form-group">
                <label>Roles <span class="label-hint">(selecciona uno o varios)</span></label>
                <div class="roles-grid">
                  <label
                    v-for="option in roleOptions"
                    :key="option.value"
                    class="role-checkbox"
                    :class="{
                      selected: editUserForm.roles.includes(option.value),
                      disabled: option.value === 'admin' && adminCheckboxDisabled
                    }"
                    :title="option.value === 'admin' && adminCheckboxDisabled ? 'No puedes quitarte el rol de Administrador' : ''"
                  >
                    <input
                      type="checkbox"
                      :value="option.value"
                      v-model="editUserForm.roles"
                      :disabled="option.value === 'admin' && adminCheckboxDisabled"
                    />
                    <span>{{ option.label }}</span>
                  </label>
                </div>
                <span v-if="editRolesError" class="field-error">{{ editRolesError }}</span>
                <span v-if="adminCheckboxDisabled" class="self-edit-hint">
                  ⚠ No puedes quitarte el rol de Administrador
                </span>
              </div>
              <!-- ─────────────────────────────── -->

              <div class="form-group">
                <label>Etiquetas (separadas por coma)</label>
                <input v-model="editUserForm.tagsInput" type="text" />
              </div>
              <div class="form-group">
                <label>Nueva contraseña (dejar vacío para mantener)</label>
                <input v-model="editUserForm.password" type="password" />
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" @click="closeEditUserModal">Cancelar</button>
              <button class="btn-submit" @click="updateUser">Guardar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Lista de manuscritos (modal) ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showManuscriptsModal" class="modal-overlay" @click.self="showManuscriptsModal = false">
          <div class="modal manuscripts-modal">
            <div class="modal-header">
              <h2>Manuscritos</h2>
              <button class="btn-close" @click="showManuscriptsModal = false">✕</button>
            </div>
            <div class="modal-body manuscripts-body">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Revisores</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in manuscritos" :key="m.id">
                    <td><strong>{{ m.title }}</strong></td>
                    <td><span class="role-badge" :class="statusClass(m.status)">{{ m.status }}</span></td>
                    <td>
                      <div v-if="m.reviewers && m.reviewers.length > 0" class="reviewers-cell">
                        <div v-for="rev in m.reviewers" :key="rev.reviewerId" class="reviewer-row">
                          <span class="reviewer-name">{{ rev.reviewerName || 'Revisor' }}</span>
                          <span class="reviewer-status" :class="rev.status">{{ formatStatus(rev.status) }}</span>
                          <span class="reviewer-days" :class="{ 'days-warning': getDaysLeft(rev) < 7 }">
                            {{ getDaysLeft(rev) }} días
                          </span>
                          <button class="btn-remove" @click="openRemoveModal(m, rev)" title="Eliminar revisor">✕</button>
                        </div>
                      </div>
                      <span v-else class="no-reviewers">Sin revisores</span>
                    </td>
                    <td><button class="btn-action" @click="openEditDeadlineModal(m)">⏱ Plazo</button></td>
                  </tr>
                  <tr v-if="manuscritos.length === 0">
                    <td colspan="4" style="text-align:center;color:var(--muted)">No hay manuscritos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { useAppStore } from '@/shared/stores/appStore'
import { useAuthStore } from '@/shared/stores/authStore'

const store = useAppStore()
const authStore = useAuthStore()

// ID del administrador que está usando el panel ahora mismo
const currentUserId = computed(() => authStore.user?.id || authStore.user?._id || '')
const API_URL = '/api/manuscripts'
const USERS_URL = '/api/users'

const stats = ref({ usuarios: 0, articulos: 0, revisiones: 0, revisores: 0 })
const usuarios = ref([])
const manuscritos = ref([])
const loading = ref(true)
const showRemoveModal = ref(false)
const showDeadlineModal = ref(false)
const showOptionsModal = ref(false)
const showUsersModal = ref(false)
const showManuscriptsModal = ref(false)
const showEditUserModal = ref(false)
const showManuscriptDetailModal = ref(false)
const selectedManuscript = ref(null)
const selectedReviewer = ref(null)
const newDeadline = ref(21)
const selectedUser = ref(null)
const editRolesError = ref('')

// ── #2755 Verificación de autores ────────────────────────────────────────────
const verifyingAuthors = ref(false)
const authorVerification = ref([])  // [{ name, registered }]

async function verifyAuthors(manuscript) {
  if (!manuscript?.authors?.length) {
    authorVerification.value = []
    return
  }
  verifyingAuthors.value = true
  try {
    // Obtenemos todos los usuarios registrados (ya los tenemos en memoria)
    // y comparamos por nombre completo (case-insensitive)
    const registeredNames = usuarios.value.map(u =>
      `${u.nombres || ''} ${u.apellido_paterno || ''} ${u.apellido_materno || ''}`.toLowerCase().trim()
    )
    const registeredEmails = usuarios.value.map(u => (u.email || '').toLowerCase())

    authorVerification.value = manuscript.authors.map(a => {
      const name = (a.name || a).toString().trim()
      const nameLower = name.toLowerCase()
      // Coincidencia por nombre completo o por email
      const registered =
        registeredNames.some(rn => rn.includes(nameLower) || nameLower.includes(rn)) ||
        registeredEmails.includes(nameLower)
      return { name, registered }
    })
  } finally {
    verifyingAuthors.value = false
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ── #2758 Opciones de rol ─────────────────────────────────────────────────────
const roleOptions = [
  { value: 'autor',          label: 'Autor' },
  { value: 'revisor',        label: 'Revisor' },
  { value: 'editor_seccion', label: 'Editor de Sección' },
  { value: 'editor_jefe',    label: 'Editor Jefe' },
  { value: 'admin',          label: 'Administrador' }
]
// ─────────────────────────────────────────────────────────────────────────────

const editUserForm = ref({
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  email: '',
  organizacion: '',
  roles: [],   // ← array de roles (multi-rol)
  tagsInput: '',
  password: ''
})

function openUsersModal() {
  showOptionsModal.value = false
  showUsersModal.value = true
}

function openManuscriptsModal() {
  showOptionsModal.value = false
  showManuscriptsModal.value = true
}

onMounted(async () => {
  await fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const [msRes, usersRes] = await Promise.all([
      axios.get(API_URL),
      axios.get(USERS_URL)
    ])
    manuscritos.value = msRes.data
    usuarios.value = usersRes.data

    stats.value = {
      usuarios: usuarios.value.length,
      articulos: manuscritos.value.length,
      revisiones: manuscritos.value.reduce((sum, m) => sum + (m.reviewers?.length || 0), 0),
      // Cuenta usuarios que tengan 'revisor' entre sus roles
      revisores: usuarios.value.filter(u =>
        (u.roles || [u.rol]).includes('revisor')
      ).length
    }
  } catch (err) {
    console.error('Error fetching data:', err)
  } finally {
    loading.value = false
  }
}

function statusClass(status) {
  const map = {
    'Enviado': 's-enviado',
    'En revisión': 's-revision',
    'Decisión': 's-decision',
    'Aceptado': 's-aceptado',
    'Rechazado': 's-rechazado'
  }
  return map[status] || 's-enviado'
}

function formatStatus(status) {
  const map = { pendiente: 'Pendiente', aceptada: 'Aceptada', completada: 'Completada' }
  return map[status] || status
}

function getDaysLeft(rev) {
  if (rev.completedAt) return 0
  if (rev.deadline) {
    const days = Math.ceil((new Date(rev.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }
  const assigned = rev.assignedAt ? new Date(rev.assignedAt) : new Date()
  const days = 21 - Math.ceil((new Date() - assigned) / (1000 * 60 * 60 * 24))
  return days > 0 ? days : 0
}

function formatDeadline(m) {
  if (!m.reviewers || m.reviewers.length === 0) return '-'
  const activeReviewer = m.reviewers.find(r => !r.completedAt)
  if (!activeReviewer || !activeReviewer.deadline) return '21 días'
  const deadline = new Date(activeReviewer.deadline)
  const day = String(deadline.getDate()).padStart(2, '0')
  const month = String(deadline.getMonth() + 1).padStart(2, '0')
  const year = deadline.getFullYear()
  return `${day}/${month}/${year}`
}

function openRemoveModal(m, rev) {
  selectedManuscript.value = m
  selectedReviewer.value = rev
  showRemoveModal.value = true
}

function closeRemoveModal() {
  showRemoveModal.value = false
  selectedManuscript.value = null
  selectedReviewer.value = null
}

async function removeReviewer() {
  if (!selectedManuscript.value || !selectedReviewer.value) return
  try {
    await axios.delete(`${API_URL}/${selectedManuscript.value.id}/reviewers/${selectedReviewer.value.reviewerId}`)
    store.pushToast('Revisor eliminado del manuscrito')
    await fetchData()
    closeRemoveModal()
  } catch (err) {
    console.error('Error removing reviewer:', err)
    store.pushToast('Error al eliminar revisor')
  }
}

function openEditDeadlineModal(m) {
  selectedManuscript.value = m
  newDeadline.value = 21
  showDeadlineModal.value = true
}

function closeDeadlineModal() {
  showDeadlineModal.value = false
  selectedManuscript.value = null
}

async function updateDeadline() {
  if (!selectedManuscript.value || !newDeadline.value) return
  try {
    const res = await axios.put(`${API_URL}/${selectedManuscript.value.id}/deadline`, {
      days: Number(newDeadline.value)
    })
    const newDeadlineDate = res.data.deadline
    if (selectedManuscript.value.reviewers) {
      selectedManuscript.value.reviewers.forEach(r => {
        if (!r.completedAt) r.deadline = newDeadlineDate
      })
    }
    const idx = manuscritos.value.findIndex(m => m.id === selectedManuscript.value.id)
    if (idx !== -1 && manuscritos.value[idx].reviewers) {
      manuscritos.value[idx].reviewers.forEach(r => {
        if (!r.completedAt) r.deadline = newDeadlineDate
      })
    }
    store.pushToast('Plazo actualizado')
    closeDeadlineModal()
  } catch (err) {
    console.error('Error updating deadline:', err)
    store.pushToast('Error al actualizar plazo: ' + (err.response?.data?.error || err.message))
  }
}

async function openManuscriptDetailModal(m) {
  selectedManuscript.value = m
  newDeadline.value = 21
  showManuscriptDetailModal.value = true
  await verifyAuthors(m)   // ← #2755 verifica autores al abrir el detalle
}

function closeManuscriptDetailModal() {
  showManuscriptDetailModal.value = false
  selectedManuscript.value = null
  authorVerification.value = []
}

function openRemoveModalFromDetail(rev) {
  selectedReviewer.value = rev
  showRemoveModal.value = true
}

async function updateDeadlineFromDetail() {
  if (!selectedManuscript.value || !newDeadline.value) return
  try {
    const res = await axios.put(`${API_URL}/${selectedManuscript.value.id}/deadline`, {
      days: Number(newDeadline.value)
    })
    const newDeadlineDate = res.data.deadline
    if (selectedManuscript.value.reviewers) {
      selectedManuscript.value.reviewers.forEach(r => {
        if (!r.completedAt) r.deadline = newDeadlineDate
      })
    }
    const idx = manuscritos.value.findIndex(m => m.id === selectedManuscript.value.id)
    if (idx !== -1 && manuscritos.value[idx].reviewers) {
      manuscritos.value[idx].reviewers.forEach(r => {
        if (!r.completedAt) r.deadline = newDeadlineDate
      })
    }
    store.pushToast('Plazo actualizado')
  } catch (err) {
    console.error('Error updating deadline:', err)
    store.pushToast('Error al actualizar plazo: ' + (err.response?.data?.error || err.message))
  }
}

function roleClass(rol) {
  const map = {
    'autor': 'r-autor',
    'revisor': 'r-revisor',
    'editor_seccion': 'r-editor',
    'editor_jefe': 'r-editor',
    'admin': 'r-admin'
  }
  return map[rol] || 'r-autor'
}

function formatRole(rol) {
  const map = {
    'autor': 'Autor',
    'revisor': 'Revisor',
    'editor_seccion': 'Editor de Sección',
    'editor_jefe': 'Editor Jefe',
    'admin': 'Administrador'
  }
  return map[rol] || rol
}

// ── Protección: el admin no puede quitarse a sí mismo el rol 'admin' ─────────
// Devuelve true si el checkbox de 'admin' debe estar deshabilitado para el
// usuario que se está editando actualmente.
const adminCheckboxDisabled = computed(() => {
  if (!selectedUser.value) return false
  const editedId = selectedUser.value.id || selectedUser.value._id || ''
  return String(editedId) === String(currentUserId.value)
})

// Watcher de seguridad: si el admin está editando su propio usuario y de alguna
// forma 'admin' desaparece del array (p. ej. manipulación del DOM), lo reinserta.
watch(
  () => editUserForm.value?.roles,
  (roles) => {
    if (adminCheckboxDisabled.value && roles && !roles.includes('admin')) {
      roles.push('admin')
    }
  },
  { deep: true }
)
// ─────────────────────────────────────────────────────────────────────────────

function openEditUserModal(u) {
  selectedUser.value = u
  editRolesError.value = ''
  editUserForm.value = {
    nombres: u.nombres || '',
    apellido_paterno: u.apellido_paterno || '',
    apellido_materno: u.apellido_materno || '',
    email: u.email || '',
    organizacion: u.organizacion || '',
    // Soporta tanto `roles` (array nuevo) como `rol` (string legado)
    roles: Array.isArray(u.roles) ? [...u.roles] : (u.rol ? [u.rol] : ['autor']),
    tagsInput: u.tags ? u.tags.join(', ') : '',
    password: ''
  }
  showEditUserModal.value = true
}

function closeEditUserModal() {
  showEditUserModal.value = false
  selectedUser.value = null
  editRolesError.value = ''
}

async function updateUser() {
  if (!selectedUser.value) return

  // Validar que tenga al menos un rol
  if (editUserForm.value.roles.length === 0) {
    editRolesError.value = 'Selecciona al menos un rol'
    return
  }

  // Protección: el admin no puede quitarse a sí mismo el rol 'admin'
  const editedId = String(selectedUser.value.id || selectedUser.value._id || '')
  if (editedId === String(currentUserId.value) && !editUserForm.value.roles.includes('admin')) {
    editRolesError.value = 'No puedes quitarte el rol de Administrador a ti mismo'
    return
  }

  editRolesError.value = ''

  try {
    const data = {
      nombres: editUserForm.value.nombres,
      apellido_paterno: editUserForm.value.apellido_paterno,
      apellido_materno: editUserForm.value.apellido_materno,
      email: editUserForm.value.email,
      organizacion: editUserForm.value.organizacion,
      roles: editUserForm.value.roles,   // ← array de roles
      tags: editUserForm.value.tagsInput.split(',').map(t => t.trim()).filter(t => t)
    }
    if (editUserForm.value.password) {
      data.password = editUserForm.value.password
    }
    await axios.put(`${USERS_URL}/${selectedUser.value.id}`, data)
    store.pushToast('Usuario actualizado correctamente')
    await fetchData()
    closeEditUserModal()
  } catch (err) {
    console.error('Error updating user:', err)
    store.pushToast('Error al actualizar usuario')
  }
}
</script>

<style scoped>
.admin-container { max-width: 900px; margin: 0 auto; }
.admin-title { font-size: 20px; font-weight: 600; margin-bottom: 20px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
.stat-card { background: white; border-radius: var(--radius); padding: 16px; border: 1px solid var(--border); text-align: center; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--blue); }
.stat-label { font-size: 11px; color: var(--muted); margin-top: 4px; }
.admin-section { background: white; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 20px; overflow: hidden; }
.admin-section-header { padding: 14px 16px; border-bottom: 1px solid var(--border); font-size: 14px; font-weight: 600; background: var(--light); }
.admin-table { width: 100%; }
.admin-table th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--muted); background: var(--light); border-bottom: 1px solid var(--border); }
.admin-table td { padding: 12px 16px; border-bottom: 1px solid var(--light); font-size: 13px; vertical-align: top; }
.admin-table tr:last-child td { border-bottom: none; }
.admin-table tr:hover td { background: var(--light); }
.role-badge { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 100px; }
.s-enviado { background: #eff6ff; color: #1d4ed8; }
.s-revision { background: #fef9c3; color: #a16207; }
.s-decision { background: #fff7ed; color: #c2410c; }
.s-aceptado { background: #f0fdf4; color: #15803d; }
.s-rechazado { background: #fff1f2; color: #be123c; }
.reviewers-cell { display: flex; flex-direction: column; gap: 4px; }
.reviewer-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.reviewer-name { font-weight: 500; }
.reviewer-status { font-size: 10px; padding: 2px 6px; border-radius: 100px; }
.reviewer-status.pendiente { background: #fef3c7; color: #d97706; }
.reviewer-status.aceptada { background: #dbeafe; color: #2563eb; }
.reviewer-status.completada { background: #dcfce7; color: #16a34a; }
.reviewer-days { font-size: 10px; color: var(--muted); }
.reviewer-days.days-warning { color: #dc2626; font-weight: 600; }
.btn-remove { background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 12px; padding: 2px 4px; }
.btn-remove:hover { color: #dc2626; }
.no-reviewers { font-size: 12px; color: var(--muted); }
.btn-action { padding: 4px 10px; font-size: 12px; border-radius: 6px; border: 1px solid var(--border); background: white; cursor: pointer; }
.btn-action:hover { background: var(--light); }
.loading { padding: 40px; text-align: center; color: var(--muted); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal { background: var(--white); border-radius: 16px; width: 100%; max-width: 450px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden; }
.modal-header { padding: 24px 24px 10px; position: relative; }
.modal-header h2 { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
.modal-header p { font-size: 13px; color: var(--muted); margin: 0; }
.modal-body { padding: 16px 24px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px; }
.form-group input { width: 100%; border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 14px; outline: none; box-sizing: border-box; }
.form-group input:focus { border-color: var(--blue); }
.modal-actions { display: flex; gap: 10px; padding: 16px 24px 24px; }
.btn-cancel { flex: 1; padding: 12px 20px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--white); font-size: 14px; cursor: pointer; }
.btn-submit { flex: 1; padding: 12px 20px; border: none; border-radius: 10px; background: var(--blue); font-size: 14px; color: white; cursor: pointer; }

/* ── Lista de roles en tabla ── */
.roles-cell { display: flex; flex-wrap: wrap; gap: 4px; }

/* ── Checkboxes de roles en el formulario de edición ── */
.label-hint { font-size: 11px; font-weight: 400; color: var(--muted); }
.roles-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 4px; }
.role-checkbox {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  border: 1.5px solid var(--border); border-radius: 8px;
  cursor: pointer; font-size: 13px;
  transition: border-color 0.15s, background 0.15s;
  user-select: none;
}
.role-checkbox:hover { border-color: var(--blue); }
.role-checkbox.selected {
  border-color: var(--blue);
  background: color-mix(in srgb, var(--blue) 8%, transparent);
  color: var(--blue);
  font-weight: 500;
}
.role-checkbox input[type="checkbox"] { width: 14px; height: 14px; accent-color: var(--blue); flex-shrink: 0; margin: 0; }
.field-error { font-size: 12px; color: var(--red); margin-top: 4px; display: block; }

/* ── #2755 Verificación de autores ── */
.authors-loading { font-size: 13px; color: var(--muted); padding: 4px 0; }
.authors-list { display: flex; flex-direction: column; gap: 6px; }
.author-row {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 8px; font-size: 13px;
}
.author-ok { background: #f0fdf4; border: 1px solid #bbf7d0; }
.author-missing { background: #fff7ed; border: 1px solid #fed7aa; }
.author-icon { font-size: 13px; font-weight: 700; flex-shrink: 0; }
.author-ok .author-icon { color: #16a34a; }
.author-missing .author-icon { color: #ea580c; }
.author-name { flex: 1; font-weight: 500; }
.author-status-label { font-size: 11px; color: var(--muted); white-space: nowrap; }
.author-ok .author-status-label { color: #16a34a; }
.author-missing .author-status-label { color: #ea580c; }
/* ─────────────────────────── */

.users-modal { max-width: 800px; }
.users-modal .modal-body { max-height: 500px; overflow-y: auto; }
.btn-close { position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 18px; cursor: pointer; color: var(--muted); }
.r-autor { background: var(--blue-soft); color: var(--blue); }
.r-revisor { background: var(--green-soft); color: var(--green); }
.r-editor { background: var(--orange-soft); color: var(--orange); }
.r-admin { background: var(--red-soft); color: var(--red); }
.form-group select { width: 100%; border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 14px; outline: none; background: var(--white); }
.form-group select:focus { border-color: var(--blue); }
.stat-card:hover { border-color: var(--blue); }
.confirm-modal { max-width: 400px; }
.btn-delete-confirm { flex: 1; padding: 12px 20px; border: none; border-radius: 10px; background: #dc2626; font-size: 14px; font-weight: 500; color: white; cursor: pointer; }
.btn-delete-confirm:hover { background: #b91c1c; }

.options-modal { max-width: 450px; }
.options-body { display: flex; flex-direction: column; gap: 12px; padding: 12px 24px 24px; }
.option-card { display: flex; align-items: center; gap: 16px; padding: 16px; border: 1.5px solid var(--border); border-radius: 12px; cursor: pointer; transition: all .2s; }
.option-card:hover { border-color: var(--blue); background: var(--light); }
.option-icon { font-size: 28px; }
.option-text { flex: 1; }
.option-title { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
.option-desc { font-size: 12px; color: var(--muted); }

.manuscripts-modal { max-width: 900px; }
.manuscripts-modal .modal-body { max-height: 500px; overflow-y: auto; }

.detail-modal { max-width: 550px; }
.detail-modal .modal-body.scrollable { max-height: 60vh; overflow-y: auto; }
.modal-body.scrollable { max-height: 60vh; overflow-y: auto; }
.detail-section { margin-bottom: 16px; }
.detail-section label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 6px; }
.detail-text { font-size: 14px; color: var(--text); line-height: 1.5; }
.detail-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-chip { font-size: 11px; padding: 2px 8px; border-radius: 100px; background: var(--light); border: 1px solid var(--border); }
.reviewers-list { display: flex; flex-direction: column; gap: 8px; }
.reviewer-item { display: flex; align-items: center; justify-content: space-between; padding: 10px; border: 1px solid var(--border); border-radius: 8px; }
.reviewer-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.reviewer-item .reviewer-name { font-weight: 500; }
.reviewer-item .reviewer-status { font-size: 10px; padding: 2px 6px; border-radius: 100px; }
.reviewer-item .reviewer-days { font-size: 11px; }
.reviewer-item .btn-remove { font-size: 14px; padding: 4px 8px; }
.deadline-edit { display: flex; gap: 8px; align-items: center; }
.deadline-edit input { width: 80px; padding: 8px; }
.btn-submit-small { padding: 8px 12px; background: var(--blue); color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; }
.detail-actions { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
.btn-view-pdf { display: inline-block; padding: 10px 16px; background: var(--blue-soft); color: var(--blue); text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 500; }
.btn-view-pdf:hover { background: #dbeafe; }

.manuscript-row { cursor: pointer; }
.manuscript-row:hover { background: var(--light); }

.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
