<template>
  <div class="cp-panel">
    <!-- Selector de hilo (solo autor con múltiples revisores) -->
    <div v-if="isAuthor && threads.length > 1" class="cp-threads">
      <button
        v-for="t in threads"
        :key="t.reviewerId"
        class="cp-thread-btn"
        :class="{ active: selectedReviewerId === t.reviewerId }"
        @click="selectThread(t.reviewerId)"
      >
        {{ t.reviewerName }}
      </button>
    </div>

    <div v-if="isAuthor && threads.length === 0" class="cp-empty">
      No hay revisores asignados aún.
    </div>

    <template v-else-if="activeThread || !isAuthor">
      <!-- Mensajes -->
      <div class="cp-messages" ref="messagesEl">
        <div v-if="loadingComments" class="cp-loading">Cargando...</div>
        <div v-else-if="comments.length === 0" class="cp-empty-msg">
          Sin comentarios. ¡Sé el primero en escribir!
        </div>
        <div
          v-for="c in comments"
          :key="c._id"
          class="cp-msg"
          :class="c.senderId === currentUserId ? 'cp-msg-mine' : 'cp-msg-theirs'"
        >
          <div class="cp-msg-name">{{ c.senderName }}</div>
          <div class="cp-msg-bubble">{{ c.text }}</div>
          <div class="cp-msg-time">{{ formatTime(c.createdAt) }}</div>
        </div>
      </div>

      <!-- Input -->
      <div class="cp-input-row">
        <textarea
          v-model="newText"
          class="cp-textarea"
          placeholder="Escribe un comentario..."
          rows="2"
          @keydown.enter.exact.prevent="send"
        ></textarea>
        <button class="cp-send-btn" :disabled="!newText.trim() || sending" @click="send">
          {{ sending ? '...' : 'Enviar' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '@/shared/stores/authStore'

const props = defineProps({
  manuscriptId: { type: String, required: true }
})

const authStore = useAuthStore()
const API_URL = '/api'

const currentUserId = computed(() => authStore.user?.id)
const isAuthor = computed(() => authStore.user?.rol === 'autor')

const threads = ref([])           // solo para autor: lista de revisores
const selectedReviewerId = ref(null)
const comments = ref([])
const newText = ref('')
const sending = ref(false)
const loadingComments = ref(false)
const messagesEl = ref(null)

const activeThread = computed(() => {
  if (!isAuthor.value) return true  // revisor siempre tiene su hilo
  return threads.value.find(t => t.reviewerId === selectedReviewerId.value)
})

onMounted(async () => {
  if (isAuthor.value) {
    await fetchThreads()
    if (threads.value.length === 1) {
      selectedReviewerId.value = threads.value[0].reviewerId.toString()
    }
  }
  await fetchComments()
})

async function fetchThreads() {
  try {
    const res = await axios.get(`${API_URL}/comments/${props.manuscriptId}/threads`, {
      headers: authHeaders()
    })
    threads.value = res.data.map(t => ({ ...t, reviewerId: t.reviewerId.toString() }))
  } catch (e) { console.error(e) }
}

async function fetchComments() {
  loadingComments.value = true
  try {
    const params = {}
    if (isAuthor.value && selectedReviewerId.value) {
      params.reviewerId = selectedReviewerId.value
    }
    const res = await axios.get(`${API_URL}/comments/${props.manuscriptId}`, {
      headers: authHeaders(),
      params
    })
    comments.value = res.data
    await nextTick()
    scrollBottom()
  } catch (e) {
    console.error(e)
  } finally {
    loadingComments.value = false
  }
}

async function send() {
  if (!newText.value.trim() || sending.value) return
  sending.value = true
  try {
    const body = { text: newText.value.trim() }
    if (isAuthor.value) body.reviewerId = selectedReviewerId.value
    await axios.post(`${API_URL}/comments/${props.manuscriptId}`, body, {
      headers: authHeaders()
    })
    newText.value = ''
    await fetchComments()
  } catch (e) {
    console.error(e)
  } finally {
    sending.value = false
  }
}

function selectThread(reviewerId) {
  selectedReviewerId.value = reviewerId
  fetchComments()
}

function authHeaders() {
  return { Authorization: `Bearer ${authStore.token}` }
}

function scrollBottom() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

watch(() => props.manuscriptId, async () => {
  threads.value = []
  selectedReviewerId.value = null
  comments.value = []
  if (isAuthor.value) await fetchThreads()
  await fetchComments()
})
</script>

<style scoped>
.cp-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 300px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid var(--border, #e5e7eb);
  overflow: hidden;
}

/* Tabs de hilos (autor con varios revisores) */
.cp-threads {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border, #e5e7eb);
  background: white;
  flex-wrap: wrap;
}
.cp-thread-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 100px;
  border: 1px solid var(--border, #e5e7eb);
  background: white;
  cursor: pointer;
  color: #6b7280;
  transition: all .15s;
}
.cp-thread-btn.active {
  background: var(--blue, #3b82f6);
  color: white;
  border-color: var(--blue, #3b82f6);
}

/* Mensajes */
.cp-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cp-loading, .cp-empty-msg, .cp-empty {
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  margin: auto;
}

.cp-msg { display: flex; flex-direction: column; max-width: 80%; }
.cp-msg-mine { align-self: flex-end; align-items: flex-end; }
.cp-msg-theirs { align-self: flex-start; align-items: flex-start; }

.cp-msg-name { font-size: 10px; color: #9ca3af; margin-bottom: 3px; }
.cp-msg-bubble {
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}
.cp-msg-mine .cp-msg-bubble { background: var(--blue, #3b82f6); color: white; border-bottom-right-radius: 3px; }
.cp-msg-theirs .cp-msg-bubble { background: white; border: 1px solid var(--border, #e5e7eb); border-bottom-left-radius: 3px; }
.cp-msg-time { font-size: 10px; color: #d1d5db; margin-top: 3px; }

/* Input */
.cp-input-row {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: white;
  align-items: flex-end;
}
.cp-textarea {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  resize: none;
  outline: none;
}
.cp-textarea:focus { border-color: var(--blue, #3b82f6); }
.cp-send-btn {
  background: var(--blue, #3b82f6);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.cp-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
