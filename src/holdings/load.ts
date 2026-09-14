// Loads the holder's tickets: from Kippu's derived copy when it answers
// (T-030-05); when it does not, the cached tickets read from the ledger
// (T-030-06); and only if the ledger cannot be read either, the cache as it was.

import type { AssuranceDeclaration, Ticketto } from "@ticketto/sdk";
import type { CachedHoldings, HoldingsCache } from "./cache.ts";
import { type LedgerHolding, readCachedFromLedger } from "./degraded.ts";
import type { HoldingsRead } from "./types.ts";

export interface HoldingsApi {
  readonly derived: { readonly holdings: { readonly mine: { query(): Promise<HoldingsRead> } } };
}

export type LoadedHoldings =
  | { readonly source: "kippu"; readonly entry: CachedHoldings }
  | {
      readonly source: "ledger";
      readonly entry: CachedHoldings;
      /** The cached tickets as the ledger records them now. */
      readonly tickets: readonly LedgerHolding[];
      readonly error: unknown;
    }
  | { readonly source: "cache"; readonly entry: CachedHoldings; readonly error: unknown }
  | { readonly source: "none"; readonly error: unknown };

export interface LoadHoldingsOptions {
  readonly kippu: HoldingsApi;
  readonly cache: HoldingsCache;
  readonly account: string;
  /** The ledger's assurance declaration, when the ledger is connected. */
  readonly assurance: AssuranceDeclaration | null;
  /** The SDK, when the ledger is connected: read when Kippu is not reachable. */
  readonly ledger?: Pick<Ticketto, "getTicket" | "getEvent"> | null;
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
    if (entry === null) return { source: "none", error };
    if (options.ledger) {
      const read = await readCachedFromLedger(options.ledger, entry).catch(() => null);
      if (read?.ok) return { source: "ledger", entry, tickets: read.holdings, error };
    }
    return { source: "cache", entry, error };
  }
}
