// firebase-messaging-sw.js - Archivo NUEVO
// Este archivo DEBE estar en la raíz de la aplicación

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

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

// Manejador de mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Mensaje recibido:', payload);
  
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
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejador de click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Click en notificación');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/ordenes';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

console.log('[FCM SW] ✅ Service Worker de Firebase listo');