/* eslint-env serviceworker */
const CACHE_NAME = 'naybox-v1'

// Lista de arquivos para cache
const cacheFiles = [
  '/',
  'service-worker.js',
  'manifest.json',
  'favicon.png',
  '/icon/icon-192x192.png',
  '/icon/icon-256x256.png',
  '/icon/icon-384x384.png',
  '/icon/icon-512x512.png',
  'https://res.cloudinary.com/dltf1g6ne/image/upload/v1741612648/naybox_logo_ggufct.png',
  'bundle.css',
  'bundle.js'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(cacheFiles)
    })()
  )
  // Força o service worker em espera a se tornar o ativo
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Limpa caches antigos
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      )

      // Habilita o navigation preload se suportado
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable()
      }
    })()
  )
  // Faz o service worker assumir o controle imediatamente
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      // Tenta responder do cache primeiro
      const cache = await caches.open(CACHE_NAME)
      const cachedResponse = await cache.match(event.request)

      if (cachedResponse) {
        return cachedResponse
      }

      try {
        // Se não estiver no cache, tenta buscar da rede
        const response = await fetch(event.request)
        
        // Salva no cache se for uma resposta válida
        if (response.ok) {
          cache.put(event.request, response.clone())
        }
        
        return response
      } catch (error) {
        // Se falhar ao buscar da rede, retorna uma página de fallback ou erro
        return new Response('Erro de conexão. Por favor, verifique sua internet.', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
    })()
  )
})
