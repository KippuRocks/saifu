// Accounts this Saifu has exchanged a ticket with (T-030-08; REQ-FR-3).
//
// REQ-FR-3 warns on a transfer to an unknown account. What "unknown" means is
// open for product input (features/030-saifu/plan.md §8); until then it is an
// account this Saifu has never transferred a ticket to. Kippu exposes no read of
// who sent a holder their tickets, so receiving from an account does not make it
// known. The record is per holder account, on this device only.

import type { KeyValueStorage } from "../holdings/cache.ts";

export interface ExchangedAccounts {
  isKnown(account: string): Promise<boolean>;
  record(account: string): Promise<void>;
}

const key = (holder: string) => `saifu.exchanged.v1.${holder}`;

export function exchangedAccounts(storage: KeyValueStorage, holder: string): ExchangedAccounts {
  const load = async (): Promise<string[]> => {
    try {
      const value = JSON.parse((await storage.getItem(key(holder))) ?? "[]") as unknown;
      return Array.isArray(value) ? value.filter((a): a is string => typeof a === "string") : [];
    } catch {
      return [];
    }
  };
  return {
    async isKnown(account) {
      return (await load()).includes(account);
    },
    async record(account) {
      const accounts = await load();
      if (!accounts.includes(account)) {
        await storage.setItem(key(holder), JSON.stringify([...accounts, account]));
      }
    },
  };
}
