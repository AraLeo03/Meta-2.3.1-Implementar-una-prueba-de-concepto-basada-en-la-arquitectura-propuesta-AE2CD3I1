<template>
  <div class="home">
    <div class="role-selector">
      <h1>Sistema de Revisión por Pares</h1>
      <p>Selecciona tu rol para acceder al dashboard correspondiente</p>
    </div>
    <div class="roles-grid">
      <router-link 
        v-for="role in roles" 
        :key="role.id"
        :to="role.path"
        class="role-card"
      >
        <div class="role-icon" :style="{ background: role.bgColor }">{{ role.icon }}</div>
        <div>
          <h3>{{ role.name }}</h3>
          <p>{{ role.description }}</p>
        </div>
        <div class="role-arrow">→</div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
const roles = [
  { 
    id: 'autor', 
    name: 'Autor', 
    description: 'Gestiona tus manuscritos, envía nuevos artículos y consulta el estado de tus submissions.',
    icon: '📝',
    path: '/autor',
    bgColor: '#dbeafe'
  },
  { 
    id: 'revisor', 
    name: 'Revisor', 
    description: 'Revisa invitaciones, gestiona tus revisiones y consulta artículos completados.',
    icon: '🔍',
    path: '/revisor',
    bgColor: '#dcfce7'
  },
  { 
    id: 'editor-seccion', 
    name: 'Editor de Sección', 
    description: 'Administra manuscritos de tu sección y asigna revisores a los artículos.',
    icon: '📋',
    path: '/editor-seccion',
    bgColor: '#fef3c7'
  },
  { 
    id: 'editor-jefe', 
    name: 'Editor Jefe', 
    description: 'Supervisa el flujo editorial completo, métricas generales y carga de editores.',
    icon: '👔',
    path: '/editor-jefe',
    bgColor: '#f3e8ff'
  },
  { 
    id: 'admin', 
    name: 'Administrador', 
    description: 'Gestiona usuarios, permisos, configuración del sistema y estadísticas globales.',
    icon: '⚙️',
    path: '/admin',
    bgColor: '#ffe4e6'
  }
]
</script>

<style scoped>
.home { max-width: 900px; margin: 0 auto; }
.role-selector { text-align: center; margin-bottom: 40px; }
.role-selector h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.role-selector p { color: var(--muted); font-size: 15px; }
.roles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
.role-card {
  background: var(--white);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  text-decoration: none;
  color: inherit;
  transition: all .2s;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.role-card:hover { border-color: var(--blue); box-shadow: var(--shadow); transform: translateY(-2px); }
.role-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.role-card h3 { font-size: 18px; font-weight: 600; }
.role-card p { font-size: 13px; color: var(--muted); line-height: 1.5; }
.role-arrow { margin-left: auto; color: var(--muted); }
</style>
