"use client";

import { useEffect } from "react";

/**
 * Service-worker teardown.
 *
 * Smart Jotter previously registered a PWA service worker (sw.js), but its
 * caches caused browser-only breakage after deploys (stale chunks, stuck
 * skeletons) while the Android app — which has no SW — worked fine. The SW
 * was removed; /public/sw.js is now a kill-switch that unregisters itself and
 * wipes caches for clients that still have the old one installed.
 *
 * This component never registers anything; it proactively unregisters any
 * lingering registration and clears cache storage so the browser behaves
 * exactly like the (working) Android app.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const teardown = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      } catch {
        // Teardown is best-effort; never block the app on it.
      }
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // Ignore cache-clear failures too.
      }
    };

    if (document.readyState === "complete") {
      void teardown();
    } else {
      window.addEventListener("load", () => void teardown(), { once: true });
    }
  }, []);

  return null;
}
