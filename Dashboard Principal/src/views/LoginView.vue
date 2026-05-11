<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1>PeerReview AI</h1>
        <p>Sistema de Revisión por Pares</p>
      </div>
      
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-title">Iniciar Sesión</div>
        
        <div class="field">
          <label for="email">Correo electrónico</label>
          <input 
            id="email"
            v-model="loginForm.email" 
            type="email" 
            placeholder="correo@ejemplo.com"
            required
          />
        </div>
        
        <div class="field">
          <label for="password">Contraseña</label>
          <input 
            id="password"
            v-model="loginForm.password" 
            type="password" 
            placeholder="••••••••"
            required
          />
        </div>
        
        <div v-if="authStore.error" class="error-message">
          {{ authStore.error }}
        </div>
        
        <button type="submit" class="btn-login" :disabled="authStore.loading">
          {{ authStore.loading ? 'Iniciando...' : 'Iniciar Sesión' }}
        </button>
      </form>
      
      <div class="register-link">
        ¿No tienes cuenta? 
        <button type="button" class="btn-link" @click="showRegisterModal = true">
          Regístrate aquí
        </button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showRegisterModal" class="modal-overlay" @click.self="showRegisterModal = false">
          <div class="modal-register">
            <div class="modal-header">
              <h2>Crear Cuenta</h2>
              <button class="btn-close" @click="showRegisterModal = false">×</button>
            </div>
            
            <form class="register-form" @submit.prevent="handleRegister">
              <div class="field">
                <label for="reg-email">Correo electrónico</label>
                <input 
                  id="reg-email"
                  v-model="registerForm.email" 
                  type="email" 
                  placeholder="correo@ejemplo.com"
                  required
                />
                <span v-if="registerErrors.email" class="field-error">{{ registerErrors.email }}</span>
              </div>
              
              <div class="field">
                <label for="reg-nombres">Nombres</label>
                <input 
                  id="reg-nombres"
                  v-model="registerForm.nombres" 
                  type="text" 
                  placeholder="Juan Carlos"
                  required
                />
              </div>
              
              <div class="field">
                <label for="reg-apellidoPaterno">Apellido Paterno</label>
                <input 
                  id="reg-apellidoPaterno"
                  v-model="registerForm.apellidoPaterno" 
                  type="text" 
                  placeholder="García"
                  required
                />
              </div>
              
              <div class="field">
                <label for="reg-apellidoMaterno">Apellido Materno</label>
                <input 
                  id="reg-apellidoMaterno"
                  v-model="registerForm.apellidoMaterno" 
                  type="text" 
                  placeholder="López"
                  required
                />
              </div>

              <!-- ── MULTI-ROL: checkboxes en lugar de <select> ── -->
              <div class="field">
                <label>Rol <span class="label-hint">(puedes seleccionar varios)</span></label>
                <div class="roles-grid">
                  <label
                    v-for="option in roleOptions"
                    :key="option.value"
                    class="role-checkbox"
                    :class="{ selected: registerForm.roles.includes(option.value) }"
                  >
                    <input
                      type="checkbox"
                      :value="option.value"
                      v-model="registerForm.roles"
                    />
                    <span class="role-label">{{ option.label }}</span>
                  </label>
                </div>
                <span v-if="registerErrors.roles" class="field-error">{{ registerErrors.roles }}</span>
              </div>
              <!-- ──────────────────────────────────────────────── -->
              
              <div class="field">
                <label for="reg-organizacion">Organización</label>
                <input 
                  id="reg-organizacion"
                  v-model="registerForm.organizacion" 
                  type="text" 
                  placeholder="Universidad o Institución"
                  required
                />
              </div>

              <!-- Tags: se muestra si el usuario tiene el rol revisor -->
              <div v-if="registerForm.roles.includes('revisor')" class="field">
                <label for="reg-tags">Áreas de Expertise</label>
                <input 
                  id="reg-tags"
                  v-model="registerForm.tagsInput" 
                  type="text" 
                  placeholder="Ej: Machine Learning, NLP, Redes Neuronales"
                />
                <small class="field-hint">Separados por coma</small>
              </div>
              
              <div class="field">
                <label for="reg-password">Contraseña</label>
                <input 
                  id="reg-password"
                  v-model="registerForm.password" 
                  type="password" 
                  placeholder="••••••••"
                  required
                />
                <span v-if="registerErrors.password" class="field-error">{{ registerErrors.password }}</span>
              </div>
              
              <div class="field">
                <label for="reg-confirmPassword">Confirmar Contraseña</label>
                <input 
                  id="reg-confirmPassword"
                  v-model="registerForm.confirmPassword" 
                  type="password" 
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <div v-if="registerMessage" :class="['register-message', registerSuccess ? 'success' : 'error']">
                {{ registerMessage }}
              </div>
              
              <button type="submit" class="btn-register" :disabled="authStore.loading">
                {{ authStore.loading ? 'Registrando...' : 'Crear Cuenta' }}
              </button>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/shared/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const showRegisterModal = ref(false)
const registerMessage = ref('')
const registerSuccess = ref(false)

// Opciones de rol disponibles
const roleOptions = [
  { value: 'autor',          label: 'Autor' },
  { value: 'revisor',        label: 'Revisor' },
  { value: 'editor_seccion', label: 'Editor de Sección' },
  { value: 'editor_jefe',    label: 'Editor Jefe' },
  { value: 'admin',          label: 'Administrador' }
]

const loginForm = reactive({
  email: '',
  password: ''
})

const registerForm = reactive({
  email: '',
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  roles: [],        // ← ahora es array (multi-rol)
  organizacion: '',
  password: '',
  confirmPassword: '',
  tagsInput: ''
})

const registerErrors = reactive({
  email: '',
  password: '',
  roles: ''         // ← validación de roles
})

async function handleLogin() {
  const success = await authStore.login(loginForm.email, loginForm.password)
  if (success) {
    router.push(authStore.getRoleRoute())
  }
}

function validateRegister() {
  registerErrors.email = ''
  registerErrors.password = ''
  registerErrors.roles = ''
  registerMessage.value = ''
  registerSuccess.value = false
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(registerForm.email)) {
    registerErrors.email = 'Ingresa un correo electrónico válido'
    return false
  }

  // Validar que se seleccionó al menos un rol
  if (registerForm.roles.length === 0) {
    registerErrors.roles = 'Selecciona al menos un rol'
    return false
  }
  
  if (registerForm.password.length < 6) {
    registerErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    return false
  }
  
  if (registerForm.password !== registerForm.confirmPassword) {
    registerMessage.value = 'Las contraseñas no coinciden'
    return false
  }
  
  return true
}

async function handleRegister() {
  if (!validateRegister()) return
  
  // Tags solo si tiene el rol revisor
  const tags = registerForm.roles.includes('revisor') && registerForm.tagsInput
    ? registerForm.tagsInput.split(',').map(t => t.trim()).filter(t => t)
    : []
  
  const userData = {
    email: registerForm.email,
    nombres: registerForm.nombres,
    apellidoPaterno: registerForm.apellidoPaterno,
    apellidoMaterno: registerForm.apellidoMaterno,
    roles: registerForm.roles,   // ← array de roles
    organizacion: registerForm.organizacion,
    password: registerForm.password,
    tags
  }
  
  const result = await authStore.register(userData)
  
  if (result.success) {
    registerSuccess.value = true
    registerMessage.value = 'Usuario registrado exitosamente. Ahora puedes iniciar sesión.'
    setTimeout(() => {
      showRegisterModal.value = false
      loginForm.email = registerForm.email
      loginForm.password = ''
      registerMessage.value = ''
      Object.keys(registerForm).forEach(key => {
        registerForm[key] = key === 'roles' ? [] : ''
      })
    }, 2000)
  } else {
    registerSuccess.value = false
    registerMessage.value = result.message
  }
}
</script>

<style scoped>
.login-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg);
}

.login-container {
  background: var(--white);
  border-radius: var(--radius);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--blue);
  margin-bottom: 4px;
}

.login-header p {
  color: var(--muted);
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.label-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--muted);
  margin-left: 4px;
}

.field input,
.field select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.field input:focus,
.field select:focus {
  border-color: var(--blue);
}

.field input::placeholder {
  color: var(--muted);
}

.field-error {
  font-size: 12px;
  color: var(--red);
}

.field-hint {
  font-size: 11px;
  color: var(--muted);
}

/* ── Roles grid ── */
.roles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 2px;
}

.role-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  user-select: none;
}

.role-checkbox:hover {
  border-color: var(--blue);
  background: color-mix(in srgb, var(--blue) 5%, transparent);
}

.role-checkbox.selected {
  border-color: var(--blue);
  background: color-mix(in srgb, var(--blue) 10%, transparent);
}

.role-checkbox input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: var(--blue);
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  border: none;
}

.role-label {
  font-size: 13px;
  color: var(--text);
  line-height: 1.2;
}
/* ─────────────── */

.error-message {
  background: var(--red-soft);
  color: var(--red);
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.btn-login {
  width: 100%;
  background: var(--blue);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.15s;
  margin-top: 8px;
}

.btn-login:hover:not([disabled]) {
  opacity: 0.87;
}

.btn-login[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-link {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: var(--muted);
}

.btn-link {
  background: none;
  border: none;
  color: var(--blue);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}

.btn-link:hover {
  text-decoration: underline;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-register {
  background: var(--white);
  border-radius: var(--radius);
  padding: 24px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.btn-close:hover {
  color: var(--text);
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.register-form .field {
  margin-bottom: 0;
}

.register-message {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}

.register-message.success {
  background: var(--green-soft);
  color: var(--green);
}

.register-message.error {
  background: var(--red-soft);
  color: var(--red);
}

.btn-register {
  width: 100%;
  background: var(--blue);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.15s;
  margin-top: 8px;
}

.btn-register:hover:not([disabled]) {
  opacity: 0.87;
}

.btn-register[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
