// The old Dyredata web app installed a service worker at this address, which keeps showing the old app from its
// cache in browsers (and home screen icons) that visited it. Browsers fetch this file to update that worker:
// this version empties the caches, removes itself and reloads the open pages, so they show this website.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
    })(),
  );
});
