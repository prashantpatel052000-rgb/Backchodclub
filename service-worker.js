const CACHE_NAME = "bakchodclub-v3";

const urlsToCache = [
  "./",
  "./index.html",
  "./login.html",
  "./home.html",
  "./profile.html",
  "./feed.html",
  "./chat.html",
  "./notifications.html",
  "./createpost.html",
  "./incomingCall.html",
  "./voiceCall.html",

  "./common.css",
  "./form.css",

  "./home.js",
  "./profile.js",
  "./feed.js",
  "./chat.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache each file individually and ignore failures so one
      // missing/mistyped path can't fail the entire install and
      // leave the service worker permanently uninstalled.
      return Promise.allSettled(
        urlsToCache.map(url =>
          cache.add(url).catch(err =>
            console.warn("SW cache skip:", url, err)
          )
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
