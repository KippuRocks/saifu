// Registers the holder's passkey on the ledger — `register_credential`,
// sponsored (T-030-03; REQ-CP-6, REQ-SP-1).
//
// The first registration creates the account, and is signed by the very
// credential it registers. The ledger accepts a repeated registration of the
// same credential without change, so an interrupted registration is simply
// submitted again.

import type { Receipt, Result, Ticketto } from "@ticketto/sdk";
import type { HolderCredential } from "./credential.ts";
import type { HolderStore } from "./store.ts";

export async function registerHolderCredential(
  ledger: Ticketto,
  holder: HolderCredential,
  store: HolderStore,
): Promise<Result<Receipt | null>> {
  const record = (await store.load()) ?? holder.record;
  if (record.registered) return { ok: true, value: null };
  const submitted = await ledger.registerCredential(holder.signer, {
    account: holder.account,
    registration: holder.registration,
  });
  if (!submitted.ok) return submitted;
  await store.save({ ...record, registered: true });
  return submitted;
}
