// The device cache of the holder's tickets (T-030-05; NFR-11).
//
// Holdings are shown from the device first and refreshed from Kippu's copy.
// The cache keeps each ticket's id and the holder's account, which is all a
// ledger read (T-030-06) and an access pass (T-030-07) need, plus the ledger's
// assurance declaration. It holds nothing secret, so it lives in ordinary app
// storage.

import type { AssuranceDeclaration } from "@ticketto/sdk";
import type { HoldingsRead } from "./types.ts";

export interface CachedHoldings {
  readonly account: string;
  readonly read: HoldingsRead;
  readonly assurance: AssuranceDeclaration | null;
  /** When the device received `read`, in Unix milliseconds. */
  readonly savedAt: number;
}

/** AsyncStorage's shape. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface HoldingsCache {
  load(account: string): Promise<CachedHoldings | null>;
  save(entry: CachedHoldings): Promise<void>;
}

const key = (account: string) => `saifu.holdings.v1.${account}`;

export function holdingsCache(storage: KeyValueStorage): HoldingsCache {
  return {
    async load(account) {
      const raw = await storage.getItem(key(account));
      if (raw === null) return null;
      try {
        const entry = JSON.parse(raw) as CachedHoldings;
        return entry.account === account && Array.isArray(entry.read?.holdings) ? entry : null;
      } catch {
        return null;
      }
    },
    async save(entry) {
      await storage.setItem(key(entry.account), JSON.stringify(entry));
    },
  };
}

export function memoryKeyValueStorage(): KeyValueStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: async (k) => items.get(k) ?? null,
    setItem: async (k, v) => {
      items.set(k, v);
    },
  };
}
