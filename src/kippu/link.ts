// Links the holder's ledger account to Kippu by proof of control (T-030-03;
// features/020-api-foundation/plan.md §5.1; REQ-SP-4, REQ-CP-6).
//
// kippu-api issues a challenge naming its own audience, a fresh nonce, a short
// expiry and the account. Saifu signs its proof-of-control payload with the
// holder's passkey (`@ticketto/profile-v0`'s `signProofOfControl`) — a payload
// that can never verify as a command or a pass — and kippu-api verifies it
// against the registration the ledger records. Saifu sends no registration:
// one presented by a client proves nothing. Only a `pass-webauthn` credential
// links, and a holder credential is the only kind Saifu has.

import { signProofOfControl } from "@ticketto/profile-v0";
import type { AccountId } from "@ticketto/sdk";
import { fromHex, type HolderCredential, toHex } from "../holder/credential.ts";
import type { HolderStore, KippuSessionRecord } from "../holder/store.ts";
import type { KippuClient } from "./client.ts";

/** The part of Kippu's API linking uses. */
export type HolderLinkApi = {
  readonly auth: {
    readonly holder: Pick<KippuClient["auth"]["holder"], "beginLink" | "completeLink">;
  };
};

export async function linkHolder(
  kippu: HolderLinkApi,
  holder: HolderCredential,
  store: HolderStore,
): Promise<KippuSessionRecord> {
  const { challengeId, challenge } = await kippu.auth.holder.beginLink.mutate({
    account: holder.account,
  });
  if (challenge.account !== holder.account) {
    throw new Error("kippu-api issued a challenge for another account");
  }
  const authorisation = await signProofOfControl(
    {
      audience: fromHex(challenge.audience),
      nonce: fromHex(challenge.nonce),
      expiresAt: challenge.expiresAt,
      account: challenge.account as AccountId,
    },
    holder.signer,
  );
  const linked = await kippu.auth.holder.completeLink.mutate({
    challengeId,
    authorisation: toHex(authorisation),
  });
  const session: KippuSessionRecord = {
    token: linked.session.token,
    expiresAt: new Date(linked.session.expiresAt).getTime(),
  };
  const record = (await store.load()) ?? holder.record;
  await store.save({ ...record, kippuSession: session });
  return session;
}
