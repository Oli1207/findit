// src/sw.js

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

/**
 * 1️⃣ Nettoie les caches obsolètes
 * 2️⃣ Précache les assets injectés par Workbox
 * 3️⃣ Prend le contrôle dès activation
 */
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
clientsClaim()

/**
 * Écoute les notifications push et affiche une notification personnalisée
 */
self.addEventListener('push', event => {
  const data = event.data?.json() || {
    title: 'Nouvelle notification',
    body: 'Vous avez reçu une nouvelle notification.',
    url: '/'
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/web-app-manifest-192x192.png',
      data: { url: data.url }
    })
  )
})

/**
 * Gère le clic sur la notification : ferme puis ouvre la fenêtre ciblée
 */
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  )
})
