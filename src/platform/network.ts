// What the device knows about its network. Natively Saifu does not ask: a
// request that fails is how it learns (src/holdings/load.ts). Saifu Web asks
// the browser (network.web.ts).

/** Whether the device reports that it has no network. */
export function isOffline(): boolean {
  return false;
}

/** Calls `listener` when the network comes back; returns the unsubscription. */
export function onReconnect(_listener: () => void): () => void {
  return () => {};
}
