import './registerSW.js'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import axios from 'axios'
import App from './App.vue'
import router from './router'
import './style.css'

// Configuración global de Axios
axios.defaults.baseURL = 'http://localhost:3000'
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const app = createApp(App)
const pinia = createPinia()

// EL ORDEN ES CRÍTICO:
app.use(pinia)   // 1. Primero Pinia
app.use(router)  // 2. Luego Router
app.mount('#app') // 3. Al final montar
