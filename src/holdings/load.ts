// Loads the holder's tickets (T-030-05): from Kippu's derived copy when it
// answers, else from the device cache. The ledger read for when Kippu is
// unreachable is T-030-06's.

import type { AssuranceDeclaration } from "@ticketto/sdk";
import type { CachedHoldings, HoldingsCache } from "./cache.ts";
import type { HoldingsRead } from "./types.ts";

export interface HoldingsApi {
  readonly derived: { readonly holdings: { readonly mine: { query(): Promise<HoldingsRead> } } };
}

export type LoadedHoldings =
  | { readonly source: "kippu"; readonly entry: CachedHoldings }
  | { readonly source: "cache"; readonly entry: CachedHoldings; readonly error: unknown }
  | { readonly source: "none"; readonly error: unknown };

export interface LoadHoldingsOptions {
  readonly kippu: HoldingsApi;
  readonly cache: HoldingsCache;
  readonly account: string;
  /** The ledger's assurance declaration, when the ledger is connected. */
  readonly assurance: AssuranceDeclaration | null;
  readonly now?: () => number;
}

export async function loadHoldings(options: LoadHoldingsOptions): Promise<LoadedHoldings> {
  const { kippu, cache, account } = options;
  try {
    const read = await kippu.derived.holdings.mine.query();
    const previous = await cache.load(account);
    const entry: CachedHoldings = {
      account,
      read,
      assurance: options.assurance ?? previous?.assurance ?? null,
      savedAt: (options.now ?? Date.now)(),
    };
    await cache.save(entry);
    return { source: "kippu", entry };
  } catch (error) {
    const entry = await cache.load(account);
    return entry === null ? { source: "none", error } : { source: "cache", entry, error };
  }
}
