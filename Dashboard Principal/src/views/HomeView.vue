<template>
  <div class="home">
    <div class="welcome">
      <h1>Sistema de Revisión por Pares</h1>
      <p>Bienvenido, {{ authStore.user?.nombres }}</p>
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/shared/stores/authStore'

const authStore = useAuthStore()
</script>

<style scoped>
.home { max-width: 900px; margin: 0 auto; }
.welcome { text-align: center; margin-top: 60px; }
.welcome h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.welcome p { color: var(--muted); font-size: 15px; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--blue); border-radius: 50%; margin: 40px auto; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
