/**
 * service-worker.js — Lab.Demitrio
 * Service Worker UNIFICADO para PWA + Firebase Push
 */

const CACHE_NAME = 'labdemitrio-v5';

// Importar Firebase (versión compat)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Configuración de Firebase (misma que en environment)
const firebaseConfig = {
  apiKey: 'AIzaSyAYc_qACmyDhFtqVzN-OAfFHN0X2-QUSzE',
  authDomain: 'labdemetrio-28c4d.firebaseapp.com',
  projectId: 'labdemetrio-28c4d',
  storageBucket: 'labdemetrio-28c4d.firebasestorage.app',
  messagingSenderId: '195945779360',
  appId: '1:195945779360:web:f3622d8b42639e854139c5'
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ============================================
// MANEJADOR DE MENSAJES PUSH (FIREBASE)
// ============================================

// ✅ IMPORTANTE: Este es el manejador principal para notificaciones push
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] 📨 Mensaje push recibido en background:', payload);
  
  const notificationTitle = payload.notification?.title || 'Lab.Demitrio';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una notificación pendiente',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.ordenId || 'notificacion',
    data: {
      url: payload.data?.url || '/ordenes',
      ordenId: payload.data?.ordenId
    },
    vibrate: [200, 100, 200],
    requireInteraction: true
  };
  
  // Mostrar la notificación
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ============================================
// MANEJADOR DE CLICK EN NOTIFICACIÓN
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🔘 Click en notificación:', event);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/ordenes';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Si ya hay una ventana abierta, usarla
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no, abrir nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ============================================
// INSTALL - Cache básico
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

// ============================================
// ACTIVATE - Limpiar cachés viejos
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ============================================
// FETCH - Estrategia de caché
// ============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // No cachear API
  if (url.pathname.startsWith('/api')) return;
  if (url.hostname.includes('firebase')) return;
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then(response => {
        if (response) return response;
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

console.log('[SW] ✅ Service Worker v5 - Firebase Push habilitado');