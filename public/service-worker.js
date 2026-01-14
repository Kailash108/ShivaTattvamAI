const CACHE = "ShivaTattvamAI-v0.1";

const OFFLINE_FILES = [
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

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_FILES))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE && caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", e => {
  const url = e.request.url;


  if (url.includes("AskAI.html")) return;

  e.respondWith(
    caches.match(e.request).then(res =>
      res ||
      fetch(e.request).then(net => {
        if (e.request.method === "GET") {
          caches.open(CACHE).then(c => c.put(e.request, net.clone()));
        }
        return net;
      })
    )
  );
});
