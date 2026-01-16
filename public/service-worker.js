const CACHE = "ShivaTattvamAI-v0.0.1";

const STATIC_FILES = [
  "/",
  "/index.html",
  "/SG.html",
  "/Structure.html",

  "/Styles/Index.css",
  "/Styles/SG.css",
  "/Styles/Structure.css",

  "/Scripts/Index.js",
  "/Scripts/SG.js",
  "/Scripts/Structure.js",

  "/Logo_1.png",
  "/manifest.json"
];

const API_FILES = [
  "/api/topics",
  "/api/shivagita"
];

self.addEventListener("install", e => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);

      await cache.addAll(STATIC_FILES);
      for (const api of API_FILES) {
        try {
          const res = await fetch(api);
          if (res.ok) await cache.put(api, res.clone());
        } catch (_) {}
      }
    })()
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE && caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);

  if (url.pathname === "/AskAI.html") return;

  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(res => res || fetch(req))
  );
});

self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || "ShivaTattvamAI",
      {
        body: data.body || "",
        icon: "Logo_1.png",
        badge: "Logo_1.png"
      }
    )
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const targetUrl = "index.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});


