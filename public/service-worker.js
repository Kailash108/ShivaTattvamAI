const CACHE = "ShivaTattvamAI-v0.1";

const OFFLINE_FILES = [
  "/",
  "/index.html",
  "/sg.html",
  "/structure.html",

  "/Styles/Index.css",
  "/Styles/SG.css",
  "/Styles/Structure.css",

  "/Scripts/Index.js",
  "/Scripts/SG.js",
  "/Scripts/Structure.js",

  "/Logo_1.png",
  "/manifest.json"
];

// Install
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_FILES))
  );
});

// Activate
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE && caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = req.url;

  // ❌ Only AskAI page is blocked offline
  if (url.includes("askai.html")) {
    return;
  }

  // ✅ APIs: network-first, cache only good responses
  if (url.includes("/api/")) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            caches.open(CACHE).then(c => c.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // ✅ Static files: cache-first
  e.respondWith(
    caches.match(req).then(res => res || fetch(req))
  );
});
