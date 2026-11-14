// Service Worker: App funktioniert auch bei schlechtem Empfang und lädt schnell.
// Strategie: zuerst aus dem Netz (immer aktuell), bei Funkloch aus dem Speicher.
// Bei jeder neuen Version VERSION erhöhen.
const VERSION = 'bamboo-v1';
const DATEIEN = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css', 'vendor/supabase.js',
  'js/main.js', 'js/config.js', 'js/daten.js', 'js/termine.js', 'js/ui.js',
  'js/seiten/login.js', 'js/seiten/kalender.js', 'js/seiten/eintrag.js', 'js/seiten/einkauf.js',
  'js/seiten/anleitungen.js', 'js/seiten/profil.js', 'js/seiten/admin.js',
  'fonts/caveat-600.woff2', 'icons/bambus.svg', 'icons/icon-192.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  // Nur eigene Dateien; Supabase-Anfragen immer direkt ans Netz
  if (ev.request.method !== 'GET' || url.origin !== self.location.origin) return;
  ev.respondWith(
    fetch(ev.request)
      .then((antwort) => {
        if (antwort.ok) {
          const kopie = antwort.clone();
          caches.open(VERSION).then((c) => c.put(ev.request, kopie));
        }
        return antwort;
      })
      .catch(() => caches.match(ev.request, { ignoreSearch: true })
        .then((treffer) => treffer || caches.match('index.html'))),
  );
});
