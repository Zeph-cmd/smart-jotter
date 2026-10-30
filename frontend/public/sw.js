// Kill-switch service worker.
//
// The previous smart-jotter-v1 SW (cache-first statics + network-first pages)
// caused browser-only breakage after deploys: stale chunk references and
// stuck skeletons while the Android app (no SW) worked fine. The SW gave
// little value (offline fallback only) at real reliability cost.
//
// This file exists only to uninstall the old SW and wipe its caches on every
// client that still has it registered. No fetch handler => no interception.
// pwa-register.tsx no longer registers any service worker.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
    })()
  );
});
