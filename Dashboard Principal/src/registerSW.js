// registerSW.js
// Importa este archivo en src/main.js:
//   import './registerSW.js'

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.log('[PWA] Service Worker registrado:', reg.scope)

        // Detecta actualizaciones disponibles
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Hay una nueva versión disponible — puedes mostrar un toast aquí
              console.log('[PWA] Nueva versión disponible. Recarga para actualizar.')
              // Si quieres forzar la actualización automáticamente:
              // newWorker.postMessage({ type: 'SKIP_WAITING' })
              // window.location.reload()
            }
          })
        })
      } catch (err) {
        console.warn('[PWA] Error al registrar Service Worker:', err)
      }
    })
  }
}

// Auto-ejecutar si se importa directamente
registerSW()
