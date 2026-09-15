// Saifu Web registers its service worker (T-030-19; tools/web/service-worker.ts),
// which caches the app on the first visit so it opens, and produces access
// passes, with no network (NFR-3). Without service workers — an insecure page,
// a development server — the app still runs, online only.

export function installOffline(scope: typeof globalThis = globalThis): void {
  const container = (scope as { navigator?: { serviceWorker?: ServiceWorkerContainer } }).navigator
    ?.serviceWorker;
  if (container === undefined) return;
  container.register("/sw.js", { scope: "/" }).catch(() => {});
}
