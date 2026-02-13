const CACHE_NAME = 'shoppinglist-v2'
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon.svg',
]

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Caching app shell')
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
  self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle http/https requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Don't cache API requests - let them fail/succeed naturally
  if (url.pathname.startsWith('/api/')) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update cache in background
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response.clone())
            })
          }
        }).catch(() => {
          // Offline - cached version is all we have
        })
        return cachedResponse
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response && response.status === 200 && request.method === 'GET') {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache)
          })
        }
        return response
      }).catch(() => {
        // Offline and not cached - return offline page if available
        return caches.match('/').catch(() => {
          return new Response('Offline - no cached version available', {
            status: 503,
            statusText: 'Service Unavailable'
          })
        })
      })
    })
  )
})
