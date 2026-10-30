// Le service worker de NouD.
// Pour l'instant, il sert à rendre l'app installable
// et à afficher les notifications sur téléphone.

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

// Quand on touche une notification, on ouvre NouD
self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  e.waitUntil(self.clients.openWindow("/"))
})

// Nécessaire pour que le navigateur propose d'installer l'app
self.addEventListener("fetch", () => {})
