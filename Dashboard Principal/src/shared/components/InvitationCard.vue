<template>
  <div class="inv-card">
    <div class="inv-title">{{ invitation.title }}</div>
    <div class="inv-meta">
      <span class="chip">Asignado: {{ formatDate(invitation.assignedAt) }}</span>
    </div>
    <div class="inv-footer">
      <a :href="'/api/manuscripts/' + invitation.manuscriptId + '/view'" target="_blank" class="btn-view">📖 Ver manuscrito</a>
      <div class="inv-actions">
        <button class="btn-accept" @click="$emit('accept', invitation.id)">✓ Aceptar</button>
        <button class="btn-decline" @click="$emit('decline', invitation.id)">✕ Declinar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  invitation: { type: Object, required: true }
})
defineEmits(['accept', 'decline'])

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES')
}
</script>

<style scoped>
.inv-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; border-left: 3px solid var(--blue); margin-bottom: 10px; }
.inv-title { font-size: 14px; font-weight: 600; line-height: 1.4; margin-bottom: 10px; }
.inv-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.chip { font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 100px; background: var(--light); color: var(--muted); border: 1px solid var(--border); }
.inv-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border); }
.btn-view { font-size: 12px; color: var(--blue); text-decoration: none; }
.btn-view:hover { text-decoration: underline; }
.inv-actions { display: flex; gap: 8px; }
.btn-accept, .btn-decline { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 6px; border: 1px solid; transition: opacity .15s; }
.btn-accept { background: var(--green-soft); color: var(--green); border-color: #bbf7d0; cursor: pointer; }
.btn-accept:hover { opacity: 0.8; }
.btn-decline { background: var(--light); color: var(--muted); border-color: var(--border); cursor: pointer; }
.btn-decline:hover { background: var(--red-soft); color: var(--red); border-color: #fecdd3; opacity: 1; }
</style>
