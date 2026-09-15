// Saifu Web's view of the network (T-030-19): the browser's `navigator.onLine`,
// and its `online` event.

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function onReconnect(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", listener);
  return () => window.removeEventListener("online", listener);
}
