<template>
  <div class="admin-container">
    <h1 class="admin-title">Panel del Administrador</h1>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">{{ stats.usuarios }}</div><div class="stat-label">Usuarios</div></div>
      <div class="stat-card"><div class="stat-value">{{ stats.articulos }}</div><div class="stat-label">Artículos</div></div>
      <div class="stat-card"><div class="stat-value">{{ stats.revisiones }}</div><div class="stat-label">Revisiones</div></div>
      <div class="stat-card"><div class="stat-value">{{ stats.revisores }}</div><div class="stat-label">Revisores</div></div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">Actividad Reciente</div>
      <table class="admin-table">
        <tr v-for="act in recienteActividad" :key="act.descripcion">
          <td style="width:40px">{{ tipoIcon(act.tipo) }}</td>
          <td>{{ act.descripcion }}</td>
          <td style="color:var(--muted);white-space:nowrap">{{ act.tiempo }}</td>
        </tr>
      </table>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">Usuarios del Sistema</div>
      <table class="admin-table">
        <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id">
            <td><strong>{{ u.nombre }}</strong></td>
            <td style="color:var(--muted)">{{ u.email }}</td>
            <td><span class="role-badge">{{ u.rol }}</span></td>
            <td><span class="status-dot" :class="u.estado === 'Activo' ? 'active' : 'inactive'"></span>{{ u.estado }}</td>
            <td class="admin-actions">
              <button class="btn-action">Editar</button>
              <button class="btn-action">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const stats = ref({ usuarios: 156, articulos: 423, revisiones: 891, revisores: 67 })

const usuarios = ref([
  { id: 1, nombre: 'Oscar Leonel Rodriguez Araujo', email: 'oscar.rodriguez@ejemplo.com', rol: 'Editor Jefe', estado: 'Activo' },
  { id: 2, nombre: 'Axel Eduardo Jimenez Perez', email: 'axel.jimenez@ejemplo.com', rol: 'Autor', estado: 'Activo' },
  { id: 3, nombre: 'Eduardo Hurtado Quintero', email: 'eduardo.hurtado@ejemplo.com', rol: 'Revisor', estado: 'Activo' },
  { id: 4, nombre: 'Luis Fernando Prieto Duarte', email: 'luis.prieto@ejemplo.com', rol: 'Editor de Sección', estado: 'Activo' },
  { id: 5, nombre: 'Luz María Jacobo Aldrete', email: 'luz.jacobo@ejemplo.com', rol: 'Autor', estado: 'Inactivo' },
  { id: 6, nombre: 'Ricardo Emmanuel Romo Ruiz', email: 'ricardo.romo@ejemplo.com', rol: 'Revisor', estado: 'Activo' },
])

const recienteActividad = ref([
  { tipo: 'submission', descripcion: 'Nuevo artículo: Redes Neuronales Cuánticas para Criptografía', tiempo: 'Hace 5 minutos' },
  { tipo: 'review', descripcion: 'Revisión completada por Eduardo Hurtado', tiempo: 'Hace 23 minutos' },
  { tipo: 'decision', descripcion: 'Artículo aceptado: Síntesis de Nanomateriales', tiempo: 'Hace 1 hora' },
  { tipo: 'user', descripcion: 'Nuevo usuario registrado: María García', tiempo: 'Hace 2 horas' },
])

function tipoIcon(tipo) {
  return { submission: '📄', review: '✅', decision: '📋', user: '👤' }[tipo] || '📌'
}
</script>

<style scoped>
.admin-container { max-width: 680px; margin: 0 auto; }
.admin-title { font-size: 20px; font-weight: 600; margin-bottom: 20px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
.stat-card { background: white; border-radius: var(--radius); padding: 16px; border: 1px solid var(--border); text-align: center; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--blue); }
.stat-label { font-size: 11px; color: var(--muted); margin-top: 4px; }
.admin-section { background: white; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 20px; overflow: hidden; }
.admin-section-header { padding: 14px 16px; border-bottom: 1px solid var(--border); font-size: 14px; font-weight: 600; background: var(--light); }
.admin-table { width: 100%; }
.admin-table th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--muted); background: var(--light); border-bottom: 1px solid var(--border); }
.admin-table td { padding: 12px 16px; border-bottom: 1px solid var(--light); font-size: 13px; }
.admin-table tr:last-child td { border-bottom: none; }
.admin-table tr:hover td { background: var(--light); }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-dot.active { background: var(--green); }
.status-dot.inactive { background: var(--muted); }
.role-badge { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 100px; background: var(--blue-soft); color: var(--blue); }
.admin-actions { display: flex; gap: 8px; }
.btn-action { padding: 4px 10px; font-size: 12px; border-radius: 6px; border: 1px solid var(--border); background: white; cursor: pointer; }
.btn-action:hover { background: var(--light); }
</style>
