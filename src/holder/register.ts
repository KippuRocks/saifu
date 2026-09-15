// Registers the holder's passkey on the ledger — `register_credential`,
// sponsored (T-030-03; REQ-CP-6, REQ-SP-1).
//
// The first registration creates the account, and is signed by the very
// credential it registers. The ledger accepts a repeated registration of the
// same credential without change, so an interrupted registration is simply
// submitted again.

import { registrationAccount } from "@ticketto/profile-v0";
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
  if (record.joining) {
    // Signed by this credential, the ledger would refuse it: the account already has one.
    throw new Error("a joining device's credential is registered by the account's other device");
  }
  const submitted = await ledger.registerCredential(holder.signer, {
    account: holder.account,
    registration: holder.registration,
  });
  if (!submitted.ok) return submitted;
  await store.save({ ...record, registered: true });
  return submitted;
}

export interface JoinWaitOptions {
  /** How many times to look. Defaults to 60. */
  readonly attempts?: number;
  /** Between looks, in milliseconds. Defaults to 5000. */
  readonly intervalMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
  /** Stops waiting early, as when the holder leaves the screen. */
  readonly cancelled?: () => boolean;
}

/**
 * A second device (T-030-13) waits for its credential on the ledger: the
 * account's existing device registers it. Once `getCredential` returns it, the
 * record is marked registered. Answers whether it was.
 */
export async function waitForJoinedRegistration(
  ledger: Pick<Ticketto, "getCredential">,
  holder: HolderCredential,
  store: HolderStore,
  options: JoinWaitOptions = {},
): Promise<boolean> {
  const named = registrationAccount(holder.registration);
  if (!named.ok) throw new Error("the stored registration names no account");
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const attempts = options.attempts ?? 60;
  for (let i = 0; i < attempts && !(options.cancelled?.() ?? false); i++) {
    const found = await ledger
      .getCredential(holder.account, named.value.credential)
      .catch(() => null);
    if (found?.ok && found.value !== null) {
      const record = (await store.load()) ?? holder.record;
      const { joining: _, ...rest } = record;
      await store.save({ ...rest, registered: true });
      return true;
    }
    if (i + 1 < attempts) await sleep(options.intervalMs ?? 5000);
  }
  return false;
}
