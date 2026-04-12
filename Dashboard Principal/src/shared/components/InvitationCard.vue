<template>
  <div class="inv-card">
    <div class="inv-title">{{ invitation.title }}</div>
    <div class="inv-meta">
      <span class="chip">{{ invitation.area }}</span>
      <span class="chip">Deadline: {{ invitation.deadline }}</span>
      <span v-if="invitation.offlineAvailable" class="chip chip-offline">Disponible offline</span>
    </div>
    <div class="inv-footer">
      <span class="respond-by">Responder antes del {{ invitation.respondBy }}</span>
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
</script>

<style scoped>
.inv-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; border-left: 3px solid var(--blue); margin-bottom: 10px; }
.inv-title { font-size: 14px; font-weight: 600; line-height: 1.4; margin-bottom: 10px; }
.inv-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.chip { font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 100px; background: var(--light); color: var(--muted); border: 1px solid var(--border); }
.chip-offline { background: var(--blue-soft); color: var(--blue); border-color: #bfdbfe; }
.inv-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border); }
.respond-by { font-size: 11px; color: var(--muted); }
.inv-actions { display: flex; gap: 8px; }
.btn-accept, .btn-decline { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 6px; border: 1px solid; transition: opacity .15s; }
.btn-accept { background: var(--green-soft); color: var(--green); border-color: #bbf7d0; }
.btn-decline { background: var(--light); color: var(--muted); border-color: var(--border); }
.btn-decline:hover { background: var(--red-soft); color: var(--red); border-color: #fecdd3; opacity: 1; }
</style>
