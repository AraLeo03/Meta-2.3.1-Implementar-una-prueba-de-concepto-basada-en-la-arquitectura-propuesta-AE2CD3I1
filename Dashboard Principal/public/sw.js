// ── PeerReview AI — Service Worker ───────────────────────────────────────────
// Estrategia:
//   • Activos estáticos (JS, CSS, íconos, fuentes) → Cache First
//   • Llamadas a /api/*                            → Network First (sin caché)
//   • Navegación (HTML)                            → Network First con fallback offline
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME    = 'peerreview-v1'
const OFFLINE_URL   = '/offline.html'

// Recursos que se pre-cachean al instalar el SW
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// ── Install: pre-cache recursos esenciales ────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── Activate: elimina cachés antiguas ─────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: lógica de caché por tipo de recurso ────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Las llamadas a la API nunca se cachean
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Navegación (páginas HTML): Network First con fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match(OFFLINE_URL))
        )
    )
    return
  }

  // Activos estáticos (JS, CSS, imágenes, fuentes): Cache First
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response
        }
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        return response
      })
    })
  )
})
