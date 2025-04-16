const CACHE_NAME = 'showroom-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/assets/index.css',
  '/assets/index.js',
  '/placeholder.svg'
];

// Instalar el service worker y cachear recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Recursos en caché');
        return cache.addAll(urlsToCache);
      })
  );
});

// Estrategia de caché: Network first, then cache
self.addEventListener('fetch', event => {
  // Manejar solo peticiones GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar peticiones a la API de Supabase (deben ser siempre frescas)
  if (event.request.url.includes('.supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la respuesta es válida, la clonamos y guardamos en caché
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentamos servir desde caché
        return caches.match(event.request);
      })
  );
});

// Eliminar cachés antiguos cuando se active un nuevo service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 