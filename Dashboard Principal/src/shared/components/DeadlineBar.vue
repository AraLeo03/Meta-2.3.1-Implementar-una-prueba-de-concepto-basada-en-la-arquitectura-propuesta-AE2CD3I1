<template>
  <span class="deadline-bar" :class="urgencyClass">
    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0
           10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0
           101.415-1.415L11 9.586V6z"
        clip-rule="evenodd"/>
    </svg>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  daysLeft: { type: Number, required: true },
})

const urgencyClass = computed(() => {
  if (props.daysLeft < 3) return 'urgent'
  if (props.daysLeft < 7) return 'warning'
  return 'ok'
})

const label = computed(() => {
  if (props.daysLeft === 0) return 'Vence hoy'
  if (props.daysLeft === 1) return '1 día restante'
  return `${props.daysLeft} días restantes`
})
</script>

<style scoped>
.deadline-bar {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 100px;
  white-space: nowrap;
  flex-shrink: 0;
}

.urgent  { background: var(--red-soft);    color: var(--red); }
.warning { background: var(--orange-soft); color: var(--orange); }
.ok      { background: var(--green-soft);  color: var(--green); }
</style>
