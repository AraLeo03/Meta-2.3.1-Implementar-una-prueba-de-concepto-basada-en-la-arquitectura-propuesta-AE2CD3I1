<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="overlay" @click.self="close">
        <div class="modal">
          <div class="modal-title">{{ title }}</div>
          <div v-if="subtitle" class="modal-sub">{{ subtitle }}</div>
          <slot></slot>
          <div class="modal-actions">
            <button class="btn-cancel" @click="close">Cancelar</button>
            <button class="btn-submit" :disabled="!canSubmit" @click="$emit('submit')">{{ submitLabel }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  title: { type: String, required: true },
  subtitle: String,
  submitLabel: { type: String, default: 'Aceptar' },
  canSubmit: { type: Boolean, default: true }
})

const emit = defineEmits(['close', 'submit'])

function close() {
  emit('close')
}
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal { background: var(--white); border-radius: var(--radius); padding: 24px; width: 100%; max-width: 420px; box-shadow: 0 12px 40px rgba(0,0,0,.1); }
.modal-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.modal-sub { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 5px; }
.field input, .field select, .field textarea { width: 100%; border: 1px solid var(--border); border-radius: 8px; padding: 9px 12px; font-size: 14px; outline: none; transition: border-color .15s; }
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--blue); }
.field textarea { resize: vertical; min-height: 80px; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
.btn-cancel { background: none; border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; font-size: 13px; color: var(--muted); transition: background .15s; }
.btn-cancel:hover { background: var(--light); }
.btn-submit { background: var(--blue); color: #fff; border: none; padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; transition: opacity .15s; }
.btn-submit:hover:not([disabled]) { opacity: .87; }
.btn-submit[disabled] { opacity: .4; cursor: not-allowed; }
</style>
