/**
 * service-worker.js — Lab.Demitrio
 * Service Worker ÚNICO (fusiona caché + Firebase)
 * VERSIÓN SILENCIOSA - Sin notificaciones de actualización
 */

const CACHE_NAME = 'labdemitrio-v4';  // ✅ CAMBIAR VERSIÓN para forzar actualización

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyAYc_qACmyDhFtqVzN-OAfFHN0X2-QUSzE',
  authDomain: 'labdemetrio-28c4d.firebaseapp.com',
  projectId: 'labdemetrio-28c4d',
  storageBucket: 'labdemetrio-28c4d.firebasestorage.app',
  messagingSenderId: '195945779360',
  appId: '1:195945779360:web:f3622d8b42639e854139c5'
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Variable para evitar notificaciones duplicadas
let ultimaNotificacion = null;

// ============================================
// MANEJADOR DE NOTIFICACIONES EN BACKGROUND (FCM)
// ============================================
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Mensaje en background recibido:', payload);
  
  const ahora = Date.now();
  const notificacionId = payload.data?.ordenId || payload.notification?.title;
  
  if (ultimaNotificacion === notificacionId && (ahora - (payload.timestamp || 0) < 2000)) {
    console.log('[SW] Notificación duplicada ignorada');
    return;
  }
  ultimaNotificacion = notificacionId;
  
  let titulo = payload.notification?.title || '📋 Lab.demetrio';
  let cuerpo = payload.notification?.body || 'Tienes una notificación pendiente';
  let urlDestino = payload.data?.url || '/ordenes';
  
  if (payload.data?.titulo_detallado) titulo = payload.data.titulo_detallado;
  if (payload.data?.cuerpo_detallado) cuerpo = payload.data.cuerpo_detallado;
  
  const opciones = {
    body: cuerpo,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.ordenId || `fcm-${Date.now()}`,
    data: { url: urlDestino, ...payload.data, timestamp: ahora },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: []
  };
  
  self.registration.showNotification(titulo, opciones);
});

// ============================================
// CLICK EN NOTIFICACIÓN
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación');
  event.notification.close();
  
  let urlDestino = '/ordenes';
  if (event.notification.data && event.notification.data.url) {
    urlDestino = event.notification.data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (client.url !== urlDestino && 'navigate' in client) {
              client.navigate(urlDestino);
            }
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlDestino);
        }
      })
  );
});

// ============================================
// INSTALL - SILENCIOSO
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versión silenciosa...');
  // ✅ NO mostrar ninguna notificación
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/']).catch((err) => {
        console.warn('[SW] Error cacheando:', err);
      });
    })
  );
  // ✅ Forzar activación inmediata SIN notificar
  self.skipWaiting();
});

// ============================================
// ACTIVATE - SILENCIOSO
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando versión silenciosa...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => {
            console.log('[SW] Eliminando caché antiguo:', key);
            return caches.delete(key);
          })
        )
      )
    ])
  );
});

// ============================================
// MESSAGE - SILENCIOSO (sin respuesta)
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Recibido SKIP_WAITING, actualizando...');
    self.skipWaiting();
  }
  // ✅ NO enviar respuesta que pueda generar notificación
});

// ============================================
// FETCH
// ============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/api')) return;
  if (url.hostname.includes('firebase') || url.hostname.includes('google')) return;
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && (
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.ico') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.woff2')
        )) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

console.log('[SW] ✅ Service Worker v4 - Modo completamente silencioso');